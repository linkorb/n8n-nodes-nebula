# Nebula HITL Request Node

The **Nebula HITL Request** node creates Human-in-the-Loop requests that pause workflow execution until a human responds. This enables approval workflows, manual review gates, and human decision points in your automation.

## Overview

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           HITL Request Flow                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Workflow Execution          2. Human Review         3. Resume       │
│  ┌──────────────────┐          ┌──────────────┐       ┌──────────────┐ │
│  │                  │          │              │       │              │ │
│  │  n8n creates     │  POST    │   Nebula     │       │   Workflow   │ │
│  │  HITL request   ─┼─────────▶│   displays   │       │   continues  │ │
│  │                  │          │   request    │       │   with       │ │
│  │  Workflow        │          │              │       │   response   │ │
│  │  pauses          │          │   Human      │       │              │ │
│  │  (waiting)       │          │   responds   │       │              │ │
│  │                  │          │              │       │              │ │
│  └──────────────────┘          └──────┬───────┘       └──────────────┘ │
│                                       │                      ▲         │
│                                       │   POST to webhook    │         │
│                                       └──────────────────────┘         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

1. **Request Creation**: The node POSTs a request to your Nebula backend with all details including a webhook URL
2. **Workflow Pauses**: The n8n execution enters a "waiting" state - no resources are consumed while waiting
3. **Human Action**: Nebula displays the request to a human for action
4. **Webhook Callback**: When the human responds, Nebula POSTs to the webhook URL
5. **Workflow Resumes**: n8n receives the webhook, resumes the workflow with the response data as output

## Configuration

### Credentials

This node requires **Nebula API** credentials. See the [credentials documentation](../../credentials/README.md#nebula-api) for setup instructions.

### Node Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| Title | String | Yes | A short title for the HITL request |
| Message | String | Yes | Detailed message (supports Markdown) |
| Response Type | Options | Yes | Type of response expected |
| Form JSON | JSON | No | Survey.js form definition (when Response Type = "Form") |
| Additional Data | JSON | No | Extra data to include with the request |

### Response Types

| Type | Description | Response Value |
|------|-------------|----------------|
| **Ok** | Simple acknowledgement | `"ok"` |
| **Yes/No** | Binary choice | `"yes"` or `"no"` |
| **Text** | Free-form text input | User's text input |
| **Form (survey.json)** | Custom form | Form submission data |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| Priority | Options | normal | Request priority: low, normal, high, urgent |
| Timeout (Minutes) | Number | 0 | Auto-timeout (0 = wait indefinitely) |
| Assignee | String | (none) | Email/ID to assign request to |
| Tags | String | (none) | Comma-separated tags |

## Usage

### Basic Approval Request

```
Title: Order Approval Required
Message: Please review order #{{ $json.orderId }} for ${{ $json.amount }}
Response Type: Yes/No
```

### Text Input Request

```
Title: Additional Information Needed
Message: Please provide the reason for this exception request.
Response Type: Text
```

### Custom Form Request

```
Title: Review Application
Message: Please review the following application and make a decision.
Response Type: Form (survey.json)
Form JSON:
{
  "elements": [
    {
      "type": "radiogroup",
      "name": "decision",
      "title": "Decision",
      "choices": ["Approve", "Reject", "Need More Info"]
    },
    {
      "type": "text",
      "name": "comment",
      "title": "Comments"
    }
  ]
}
```

## Output

When the webhook is called (human responds), the node outputs:

```json
{
  "requestId": "uuid-v4-string",
  "response": "approved",
  "responseValue": "approved",
  "respondedBy": "john@example.com",
  "respondedAt": "2025-01-13T11:45:00Z",
  "comment": "Looks good!",
  "data": {
    // Any additional data from the response
  }
}
```

### Accessing Response Data

In subsequent nodes, use expressions:

```javascript
// In a Code node or expression
const response = $json.response;           // "approved", "yes", "rejected", etc.
const respondedBy = $json.respondedBy;     // Who responded
const respondedAt = $json.respondedAt;     // When they responded
const comment = $json.comment;             // Optional comment
```

**In an IF node condition:**
```
{{ $json.response }} equals "approved"
```

**In a notification:**
```
Request was {{ $json.response }} by {{ $json.respondedBy }} at {{ $json.respondedAt }}
```

## Backend API Requirements

Your Nebula backend needs to implement the following:

### POST /api/v1/hitl/requests

Creates a new HITL request.

**Request Body:**

```json
{
  "requestId": "uuid-v4-string",
  "title": "Approval Required",
  "message": "Please review this order...",
  "responseType": "yesno",
  "form": null,
  "webhookUrl": "https://your-n8n.com/webhook-waiting/{executionId}/nebula-hitl-response",
  "priority": "normal",
  "timeoutMinutes": 0,
  "assignee": "john@example.com",
  "tags": ["urgent", "finance"],
  "metadata": {"tenantId": "abc123"},
  "additionalData": {"orderId": "12345"},
  "inputData": {},
  "workflowId": "workflow-id",
  "workflowName": "My Workflow",
  "executionId": "execution-id",
  "createdAt": "2025-01-13T10:30:00Z"
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

### Webhook Callback (Required)

When a human responds, your backend **MUST** POST to the `webhookUrl`:

```json
{
  "requestId": "uuid-v4-string",
  "response": "approved",
  "responseValue": "approved",
  "respondedBy": "john@example.com",
  "respondedAt": "2025-01-13T11:45:00Z",
  "comment": "Looks good!",
  "data": {
    "anyAdditionalData": "you want to pass"
  }
}
```

The `webhookUrl` format is: `https://your-n8n.com/webhook-waiting/{executionId}/nebula-hitl-response`

## Example Backend

Here's a minimal Express.js backend example:

```javascript
const express = require('express');
const app = express();

app.use(express.json());

const requests = new Map();

// Create request
app.post('/api/v1/hitl/requests', (req, res) => {
  const { requestId, webhookUrl, ...data } = req.body;
  
  requests.set(requestId, { ...data, requestId, webhookUrl, status: 'pending' });
  
  res.json({ success: true, requestId, status: 'pending' });
});

// Respond to request (called by your UI)
app.post('/api/v1/hitl/requests/:requestId/respond', async (req, res) => {
  const { requestId } = req.params;
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

app.listen(3000);
```

## Workflow Patterns

### Approval with Branching

```
[Trigger] → [Nebula HITL Request] → [Switch on Response]
                                          ├── approved → [Process]
                                          ├── rejected → [Notify Rejection]
                                          └── timeout → [Escalate]
```

### Sequential Approvals

```
[Start] → [Manager Approval] → [If Approved] → [Director Approval] → [Complete]
                 ↓                                    ↓
            [Rejected]                           [Rejected]
```

### Parallel Review

```
[Start] ─┬─→ [Reviewer 1] ─┬─→ [Merge Results] → [Decision]
         └─→ [Reviewer 2] ─┘
```

## Troubleshooting

### Workflow not resuming

1. Ensure Nebula can reach your n8n instance's webhook URL
2. Verify the `webhookUrl` in your backend logs
3. Check that the `requestId` matches in request and response

### Timeout issues

- If timeout is set, the workflow will continue after that duration
- Set timeout to `0` for indefinite waiting
- Consider using reasonable timeouts for business-critical workflows
