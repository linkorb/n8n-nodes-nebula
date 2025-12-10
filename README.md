# n8n-nodes-nebula

A custom n8n node for implementing **Nebula HITL (Human-in-the-Loop)** workflows with your own configurable REST API backend.

![Nebula HITL Request Node](docs/node-screenshot.png)

## Description

This node allows you to create human approval/input requests in your n8n workflows. Unlike other HITL solutions that are tied to specific cloud services, this node is designed to work with **your own backend**, giving you full control over how requests are created, stored, displayed, and responded to.

### Features

- ⏸️ **True Wait Functionality**: Workflow execution pauses until a human responds
- 🔐 **Configurable Backend**: Connect to your own REST API endpoint
- 📝 **Multiple Response Types**: Ok, Yes/No, Text, or Custom options
- 🏷️ **Rich Metadata**: Support for priority, assignee, tags, and custom data
- 🔄 **Webhook-based Responses**: Automatically resume workflow when human responds
- ⏰ **Configurable Timeout**: Set how long to wait for a response
- 📊 **Full Context**: Pass workflow and execution context to your backend

### How It Works

1. **Request Creation**: The node POSTs a request to your backend with all details including a webhook URL
2. **Workflow Pauses**: The n8n execution enters a "waiting" state - no resources are consumed while waiting
3. **Human Action**: Your backend displays the request to a human for action
4. **Webhook Callback**: When the human responds, your backend POSTs to the webhook URL
5. **Workflow Resumes**: n8n receives the webhook, resumes the workflow with the response data as output

## Installation

### Prerequisites

- n8n version 1.0.0 or later
- Node.js 18.10 or later
- pnpm (recommended) or npm

### Install via npm (Community Nodes)

In your n8n instance, go to **Settings → Community Nodes** and install:

```
n8n-nodes-nebula
```

### Manual Installation (Self-hosted n8n)

1. **Clone or download this repository:**

```bash
cd ~/.n8n/custom
git clone https://github.com/linkorb/n8n-nodes-nebula.git
cd n8n-nodes-nebula
```

2. **Install dependencies:**

```bash
pnpm install
```

3. **Build the node:**

```bash
pnpm build
```

4. **Restart n8n:**

```bash
# If running n8n directly
n8n start

# If running via PM2
pm2 restart n8n

# If running via Docker
docker restart n8n
```

### Installation with Docker

If you're running n8n in Docker, you can mount the custom nodes:

```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    volumes:
      - ~/.n8n:/home/node/.n8n
      - ./n8n-nodes-nebula:/home/node/.n8n/custom/n8n-nodes-nebula
    environment:
      - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom
```

## Configuration

### Setting up Credentials

1. In n8n, go to **Credentials → Add Credential**
2. Search for "Nebula API"
3. Fill in the required fields:

| Field | Description | Example |
|-------|-------------|---------|
| **Base URL** | Your Nebula API backend base URL | `https://api.mycompany.com/nebula` |
| **Username** | Authentication username | `n8n-service` |
| **Password** | Authentication password | `your-secure-password` |
| **Metadata** | Additional JSON data for all requests | `{"tenantId": "abc123"}` |

> **Note:** The webhook callback URL is automatically determined from your n8n instance configuration. You don't need to specify it manually.

## Usage

### Basic Workflow

1. Add the **Nebula HITL Request** node to your workflow
2. Connect it to your workflow flow
3. Configure the node:
   - **Title**: A short description of what needs human attention
   - **Message**: Detailed markdown-formatted message
   - **Response Type**: Choose from Ok, Yes/No, Text, or Custom

### Response Types

| Type | Description | Response Value |
|------|-------------|----------------|
| **Ok** | Simple acknowledgement | `"ok"` |
| **Yes/No** | Binary choice | `"yes"` or `"no"` |
| **Text** | Free-form text input | User's text input |
| **Custom** | Custom JSON options | Value from selected option |

### Custom Response Example

```json
{
  "buttons": [
    {"label": "Approve", "value": "approved"},
    {"label": "Reject", "value": "rejected"},
    {"label": "Need More Info", "value": "moreInfo"}
  ]
}
```

### Node Options

| Option | Description | Default |
|--------|-------------|---------|
| **Priority** | Request priority level | `normal` |
| **Timeout (Minutes)** | Auto-timeout for requests | `0` (no timeout) |
| **Assignee** | Email/ID to assign request to | (none) |
| **Tags** | Comma-separated tags | (none) |

### Additional Data

You can pass additional JSON data that will be included in the request to your backend:

```json
{
  "orderId": "12345",
  "customerName": "John Doe",
  "amount": 150.00
}
```

## Backend API Requirements

Your backend API needs to implement the following endpoint:

### POST /requests

Creates a new HITL request.

**Request Body:**

```json
{
  "requestId": "uuid-v4-string",
  "title": "Approval Required",
  "message": "Please review this order...",
  "responseType": "yesno",
  "customOptions": null,
  "webhookUrl": "https://your-n8n.com/webhook-waiting/xxx/nebula-hitl-response",
  "priority": "normal",
  "timeoutMinutes": 0,
  "assignee": "john@example.com",
  "tags": ["urgent", "finance"],
  "metadata": {"tenantId": "abc123"},
  "additionalData": {"orderId": "12345"},
  "inputData": {},
  "workflowId": "workflow-id",
  "executionId": "execution-id",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Response:**

```json
{
  "success": true,
  "requestId": "uuid-v4-string",
  "status": "pending"
}
```

### Webhook Callback (IMPORTANT - This Resumes the Workflow!)

When a human responds, your backend **MUST** call the `webhookUrl` provided in the request payload. This is what resumes the waiting n8n workflow execution.

**POST to webhookUrl:**

```json
{
  "requestId": "uuid-v4-string",
  "response": "approved",
  "responseValue": "approved",
  "respondedBy": "john@example.com",
  "respondedAt": "2024-01-15T11:45:00Z",
  "comment": "Looks good!",
  "data": {
    "anyAdditionalData": "you want to pass"
  }
}
```

**What happens:**
1. n8n receives the webhook POST
2. The waiting workflow execution resumes
3. The Nebula HITL Request node outputs the webhook payload data
4. Subsequent nodes in your workflow can access `$json.response`, `$json.respondedBy`, etc.

**The webhook URL format:** `https://your-n8n-instance.com/webhook-waiting/{executionId}/nebula-hitl-response`

The `webhookUrl` is automatically constructed and included in the request payload sent to your backend. Your backend simply needs to POST to this URL when a human responds.

### Health Check (Optional)

For credential testing, implement:

**GET /health**

```json
{
  "status": "ok"
}
```

## Example Backend Implementation

Here's a minimal Express.js backend example:

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Store requests in memory (use a database in production)
const requests = new Map();

// Create request
app.post('/requests', (req, res) => {
  const { requestId, webhookUrl, ...data } = req.body;
  
  requests.set(requestId, {
    ...data,
    requestId,
    webhookUrl,
    status: 'pending'
  });
  
  console.log('New Nebula HITL request:', requestId, data.title);
  
  res.json({ success: true, requestId, status: 'pending' });
});

// Respond to request (called by your UI)
app.post('/requests/:requestId/respond', async (req, res) => {
  const requestId = req.params.requestId;
  const { response, respondedBy } = req.body;
  
  const request = requests.get(requestId);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }
  
  // Call n8n webhook to resume workflow
  await fetch(request.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestId,
      response,
      responseValue: response,
      respondedBy,
      respondedAt: new Date().toISOString()
    })
  });
  
  requests.delete(requestId);
  
  res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => {
  console.log('Nebula HITL Backend running on port 3000');
});
```

## Workflow Example

```
[Trigger] → [Process Data] → [Nebula HITL Request] → [If Response == "approved"] → [Continue]
                                                              ↓
                                                   [Handle Rejection]
```

### Accessing Response Data

After the Nebula HITL Request node resumes (when the webhook is called), the node outputs the webhook payload data. You can access:

```javascript
// In a Code node or expression
const requestId = $json.requestId;       // The original request ID
const response = $json.response;         // The response value (e.g., "approved", "yes", "rejected")
const responseValue = $json.responseValue; // Same as response (for compatibility)
const respondedBy = $json.respondedBy;   // Who responded (email/ID)
const respondedAt = $json.respondedAt;   // ISO timestamp when they responded
const comment = $json.comment;           // Optional comment from responder
const data = $json.data;                 // Any additional data from your backend
```

**Example: Using in an IF node condition:**
```
{{ $json.response }} equals "approved"
```

**Example: Send notification with response:**
```
The request was {{ $json.response }} by {{ $json.respondedBy }} at {{ $json.respondedAt }}
```

## Development

### Project Structure

```
n8n-nodes-nebula/
├── credentials/
│   └── NebulaApi.credentials.ts
├── nodes/
│   └── NebulaHitlRequest/
│       ├── NebulaHitlRequest.node.ts
│       ├── NebulaHitlRequest.node.json
│       └── nebulaHitlRequest.svg
├── package.json
├── tsconfig.json
└── README.md
```

### Building from Source

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode (for development)
pnpm dev

# Lint
pnpm lint

# Format
pnpm format
```

## Troubleshooting

### Node not appearing in n8n

1. Ensure the build completed successfully (`pnpm build`)
2. Check that the `dist` folder contains compiled JS files
3. Verify the custom nodes path in n8n configuration
4. Restart n8n completely

### Webhook not being called

1. Ensure your n8n instance is publicly accessible or your backend can reach it
2. Check the webhookUrl in your backend logs
3. Verify the requestId matches in both the request and response

### Authentication errors

1. Verify credentials in n8n are correct
2. Check your backend's authentication logic
3. Look at the backend logs for more details

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [n8n](https://n8n.io) - Fair-code workflow automation
- [n8n documentation on creating nodes](https://docs.n8n.io/integrations/creating-nodes/)

## Support

- Create an issue on GitHub for bug reports
- Discussions for questions and feature requests
