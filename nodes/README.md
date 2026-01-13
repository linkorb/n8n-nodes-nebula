# Nebula Nodes

This package provides three n8n nodes for integrating with Nebula:

## Available Nodes

### [Nebula HITL Request](NebulaHitlRequest/README.md)

**Human-in-the-Loop workflow integration**

Create human approval/input requests that pause workflow execution until a human responds. Perfect for:

- Approval workflows
- Manual review gates
- Human decision points in automation
- Gathering input before proceeding

Key features:
- ⏸️ True wait functionality - workflow pauses until response
- 📝 Multiple response types: Ok, Yes/No, Text, or Custom forms
- 🏷️ Rich metadata: priority, assignee, tags
- ⏰ Configurable timeout

### [Nebula Action](NebulaAction/README.md)

**Execute Nebula Actions via the API**

Trigger and execute Nebula Actions from your n8n workflows. Use this to:

- Run backend automation tasks
- Execute business logic defined in Nebula
- Integrate Nebula capabilities into n8n workflows

Key features:
- 🔄 Dynamic action discovery from Nebula API
- 📥 Flexible input modes (key-value or JSON)
- ⏱️ Configurable timeouts
- 📊 Optional metadata in output

### [Nebula Trigger](NebulaTrigger/README.md)

**Webhook-based workflow trigger with Survey.js forms**

Start n8n workflows when called from external systems (like Nebula). The trigger:

- Exposes a webhook endpoint
- Accepts form data defined by Survey.js
- Allows Nebula to fetch and render the form definition

Key features:
- 📋 Survey.js form definitions
- 🔐 Optional authentication
- ✅ Built-in form validation
- 📦 Rich output with request metadata

## Credentials

These nodes use the following credential types:

| Credential | Used By | Purpose |
|------------|---------|---------|
| [Nebula API](../credentials/README.md#nebula-api) | HITL Request, Action | Authenticate outbound requests to Nebula |
| [Nebula Trigger Auth](../credentials/README.md#nebula-trigger-auth) | Trigger | Authenticate incoming webhook requests |

## Common Patterns

### Approval Workflow

```
[Trigger] → [Process Data] → [Nebula HITL Request] → [If Approved] → [Continue]
                                                            ↓
                                                   [Handle Rejection]
```

### Action Execution

```
[Trigger] → [Prepare Input] → [Nebula Action] → [Process Output] → [Next Step]
```

### Form-Triggered Workflow

```
[Nebula Trigger] → [Validate] → [Process Form Data] → [Send Response]
     ↑
     └── External system fetches form definition and submits data
```
