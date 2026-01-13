# Nebula Trigger Node

The **Nebula Trigger** node is a webhook-based trigger that starts n8n workflows when called from external systems (primarily Nebula, a PHP application). It accepts form data defined by a Survey.js form definition, which is exposed via the n8n REST API for remote systems to fetch and present to users.

> **See also:** [All Nodes](../README.md) | [Credentials](../../credentials/README.md)

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Integration Flow                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. Nebula (PHP)                2. n8n API                3. n8n Webhook   │
│   ┌──────────────┐               ┌──────────┐              ┌──────────────┐ │
│   │              │  GET          │          │              │              │ │
│   │  Fetch form  │──────────────▶│/workflows│              │              │ │
│   │  definition  │               │   /{id}  │              │              │ │
│   │              │◀──────────────│          │              │              │ │
│   └──────────────┘  Form JSON    └──────────┘              │              │ │
│          │                                                 │              │ │
│          ▼                                                 │              │ │
│   ┌──────────────┐                                         │              │ │
│   │              │                                         │              │ │
│   │ Present form │                                         │              │ │
│   │  to user     │                                         │              │ │
│   │              │                                         │              │ │
│   └──────────────┘                                         │              │ │
│          │                                                 │              │ │
│          ▼                                                 │              │ │
│   ┌──────────────┐               POST with form data       │              │ │
│   │              │────────────────────────────────────────▶│   Webhook    │ │
│   │ User submits │                                         │   receives   │ │
│   │    form      │                                         │    data      │ │
│   │              │◀────────────────────────────────────────│              │ │
│   └──────────────┘           Success response              │              │ │
│                                                            └──────────────┘ │
│                                                                    │        │
│                                                                    ▼        │
│                                                            ┌──────────────┐ │
│                                                            │   Workflow   │ │
│                                                            │    starts    │ │
│                                                            │  with input  │ │
│                                                            └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## For End Users

### How to Use the Nebula Trigger

1. **Add the Node**: Drag the "Nebula Trigger" node onto your workflow canvas as the starting point.

2. **Configure the Form**: Define your input form using Survey.js JSON format. For example, a color selection form:

   ```json
   {
     "title": "Select a Color",
     "description": "Please choose your preferred color",
     "elements": [
       {
         "type": "dropdown",
         "name": "color",
         "title": "Color",
         "description": "Select your favorite color",
         "isRequired": true,
         "choices": [
           { "value": "red", "text": "Red" },
           { "value": "green", "text": "Green" },
           { "value": "blue", "text": "Blue" },
           { "value": "yellow", "text": "Yellow" }
         ]
       }
     ]
   }
   ```

3. **Add Metadata** (Optional): Provide a description, category, and tags to help organize the workflow in Nebula.

4. **Activate the Workflow**: Save and activate your workflow to enable the webhook.

5. **Get the Webhook URL**: Once activated, n8n provides a webhook URL in the format:
   - Production: `https://your-n8n.com/webhook/{workflowId}/nebula-trigger`
   - Testing: `https://your-n8n.com/webhook-test/{workflowId}/nebula-trigger`

### Node Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| Form Definition (Survey.js) | JSON | Yes | Survey.js form definition that specifies the input fields |
| Workflow Description | String | No | Human-readable description shown in Nebula |
| Category | String | No | Category for organizing workflows |
| Tags | String | No | Comma-separated tags |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| Response Message | String | "Workflow started successfully" | Custom success message |
| Include Request Metadata | Boolean | true | Include headers, IP, timestamp in output |
| Validate Form Data | Boolean | false | Validate required fields before starting |

### Output Data Structure

When the webhook is triggered, the workflow receives data in this format:

```json
{
  "formData": {
    "color": "blue"
  },
  "color": "blue",
  "requestMetadata": {
    "timestamp": "2025-01-12T10:30:00.000Z",
    "method": "POST",
    "headers": { ... },
    "ip": "192.168.1.1",
    "path": "/webhook/123/nebula-trigger",
    "query": {}
  },
  "workflowInfo": {
    "id": "123",
    "name": "Color Workflow"
  }
}
```

- **formData**: Object containing all submitted form fields
- **Root-level fields**: Form fields are also available at root level for convenience (e.g., `{{ $json.color }}`)
- **requestMetadata**: Information about the HTTP request (if enabled)
- **workflowInfo**: Basic workflow identification

---

## For System Integrators (Nebula PHP)

### Integration Steps

#### 1. Fetch the Form Definition

Nebula should fetch the workflow definition from n8n's REST API to extract the form:

```php
// Fetch workflow definition from n8n API
$response = $httpClient->get("https://n8n.example.com/api/v1/workflows/{$workflowId}", [
    'headers' => [
        'X-N8N-API-KEY' => $apiKey,
    ],
]);

$workflow = json_decode($response->getBody(), true);

// Find the NebulaTrigger node
$triggerNode = null;
foreach ($workflow['nodes'] as $node) {
    if ($node['type'] === 'n8n-nodes-nebula.nebulaTrigger') {
        $triggerNode = $node;
        break;
    }
}

// Extract the form definition
$formJson = $triggerNode['parameters']['formJson'] ?? null;
$formDefinition = json_decode($formJson, true);

// Extract metadata
$description = $triggerNode['parameters']['workflowDescription'] ?? '';
$category = $triggerNode['parameters']['category'] ?? '';
$tags = $triggerNode['parameters']['tags'] ?? '';
```

#### 2. Present the Form to Users

Use the extracted Survey.js form definition to render a form:

```php
// In your Twig template or frontend
$this->render('workflow_form.html.twig', [
    'formDefinition' => $formDefinition,
    'workflowId' => $workflowId,
    'workflowName' => $workflow['name'],
    'description' => $description,
]);
```

```html
<!-- Using Survey.js library -->
<script src="https://unpkg.com/survey-jquery"></script>
<div id="surveyContainer"></div>
<script>
    const formDefinition = {{ formDefinition|json_encode|raw }};
    const survey = new Survey.Model(formDefinition);
    
    survey.onComplete.add((sender) => {
        const formData = sender.data;
        submitToWorkflow(formData);
    });
    
    $("#surveyContainer").Survey({ model: survey });
</script>
```

#### 3. Submit Form Data to the Webhook

When the user submits the form, POST the data to the workflow's webhook:

```php
// Construct webhook URL
// Format: {n8nBaseUrl}/webhook/{webhookPath}
// The webhook path is available in the node's webhooks[0].path or can be constructed
$webhookUrl = "https://n8n.example.com/webhook/nebula-trigger";

// Or use the workflow-specific webhook (requires looking at workflow metadata)
// $webhookUrl = "https://n8n.example.com/webhook/{workflowId}/nebula-trigger";

// Submit form data
$response = $httpClient->post($webhookUrl, [
    'json' => $formData,  // The data collected from the Survey.js form
    'headers' => [
        'Content-Type' => 'application/json',
    ],
]);

$result = json_decode($response->getBody(), true);
// Result: { "success": true, "message": "Workflow started successfully", "workflowId": "123" }
```

### Webhook URL Patterns

n8n uses different URL patterns for webhooks:

| Mode | URL Pattern | Use Case |
|------|-------------|----------|
| Production | `/webhook/nebula-trigger` | Active workflows |
| Production (unique) | `/webhook/{uuid}/nebula-trigger` | If unique paths enabled |
| Testing | `/webhook-test/nebula-trigger` | Testing in n8n editor |

### API Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success - workflow started |
| 400 | Validation error (missing required fields) |
| 404 | Webhook not found (workflow inactive) |
| 500 | Server error |

### Error Response Format

```json
{
  "success": false,
  "error": "Missing required fields",
  "missingFields": ["color", "name"]
}
```

---

## For Developers

### Project Structure

```
nodes/NebulaTrigger/
├── NebulaTrigger.node.ts      # Main node implementation
├── NebulaTrigger.node.json    # Node codex metadata
├── nebulaTrigger.svg          # Node icon (optional)
└── README.md                  # This documentation
```

### Key Concepts

#### Trigger Node Architecture

Unlike regular nodes that have inputs and outputs, trigger nodes:
- Have **no inputs** (`inputs: []`) - they are workflow entry points
- Are in the `trigger` group
- Implement a `webhook()` method to handle incoming HTTP requests
- Return `workflowData` to pass data to subsequent nodes

#### Webhook Lifecycle

```typescript
webhookMethods = {
    default: {
        async checkExists(): Promise<boolean> { /* ... */ },
        async create(): Promise<boolean> { /* ... */ },
        async delete(): Promise<boolean> { /* ... */ },
    },
};
```

These methods manage the webhook when the workflow is activated/deactivated.

#### The webhook() Method

```typescript
async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const bodyData = this.getBodyData();
    
    return {
        webhookResponse: { status: 200, body: { success: true } },
        workflowData: [this.helpers.returnJsonArray([outputData])],
    };
}
```

The method:
1. Receives the HTTP request
2. Processes the body data
3. Returns a response to the caller AND workflow data for subsequent nodes

### Building and Testing

```bash
# Install dependencies
pnpm install

# Build the node
pnpm run build

# Link to local n8n for testing
cd ~/.n8n/custom
ln -s /path/to/n8n-nodes-nebula .

# Restart n8n
n8n start
```

### Survey.js Form Reference

The form definition follows the [Survey.js JSON schema](https://surveyjs.io/Documentation/Library):

```json
{
  "title": "Form Title",
  "description": "Form description",
  "elements": [
    {
      "type": "text",
      "name": "fieldName",
      "title": "Field Label",
      "description": "Help text",
      "isRequired": true,
      "placeholder": "Enter value..."
    },
    {
      "type": "dropdown",
      "name": "selection",
      "title": "Select Option",
      "choices": ["Option 1", "Option 2", "Option 3"]
    },
    {
      "type": "radiogroup",
      "name": "choice",
      "title": "Choose One",
      "choices": [
        { "value": "a", "text": "Choice A" },
        { "value": "b", "text": "Choice B" }
      ]
    },
    {
      "type": "checkbox",
      "name": "multiSelect",
      "title": "Select Multiple",
      "choices": ["Item 1", "Item 2", "Item 3"]
    },
    {
      "type": "comment",
      "name": "notes",
      "title": "Additional Notes",
      "rows": 4
    },
    {
      "type": "boolean",
      "name": "agree",
      "title": "I agree to the terms"
    }
  ]
}
```

### Extending the Node

To add new features:

1. **Add new properties**: Extend the `properties` array in `description`
2. **Add validation**: Enhance the validation logic in `webhook()`
3. **Add authentication**: Implement credential validation if needed
4. **Add custom responses**: Modify `webhookResponse` structure

### Related Resources

- [n8n Creating Nodes Documentation](https://docs.n8n.io/integrations/creating-nodes/)
- [Survey.js Documentation](https://surveyjs.io/Documentation/Library)
- [n8n REST API](https://docs.n8n.io/api/)
