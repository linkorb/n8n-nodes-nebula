# Nebula Action Node

The **Nebula Action** node executes Nebula Actions via the Nebula API. It dynamically loads available actions from your Nebula instance and allows you to execute them with custom input parameters.

## Overview

This node connects to your Nebula instance, retrieves the list of available actions, and executes them with the input parameters you specify. The results are returned as the node's output.

## Configuration

### Credentials

This node requires **Nebula API** credentials. See the [credentials documentation](../../credentials/README.md#nebula-api) for setup instructions.

### Node Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| Action Name | Dropdown | Yes | Select from available actions loaded from your Nebula instance |
| Input Mode | Options | Yes | How to specify input parameters: "Define Below" or "JSON" |
| Input Parameters | Key-Value | No | Name-value pairs for action inputs (when Input Mode = "Define Below") |
| Input JSON | JSON | No | Raw JSON object for action inputs (when Input Mode = "JSON") |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| Timeout (Seconds) | Number | 30 | Timeout for action execution (1-300 seconds) |
| Include Metadata | Boolean | false | Include execution metadata in output |

## Usage

### Basic Usage

1. Add the **Nebula Action** node to your workflow
2. Select your Nebula API credentials
3. Choose an action from the dropdown (actions are loaded from your Nebula instance)
4. Configure input parameters

### Input Modes

#### Define Below (Key-Value)

Use this mode to define parameters individually:

| Name | Value |
|------|-------|
| message | Hello World |
| count | 5 |

Values that are valid JSON will be parsed automatically. For example, `{"key": "value"}` will be parsed as an object.

#### JSON Mode

Provide a complete JSON object:

```json
{
  "message": "Hello World",
  "count": 5,
  "options": {
    "verbose": true
  }
}
```

### Finding Action Input Arguments

To see what input arguments an action expects, open your Nebula instance at:

```
{your-nebula-url}/action/actions/{action-name}
```

This displays the action's configuration including its expected inputs.

## Output

The node outputs a JSON object with the following structure:

```json
{
  "output": {
    // Action's return value
  },
  "actionName": "my-action"
}
```

When **Include Metadata** is enabled:

```json
{
  "output": {
    // Action's return value
  },
  "actionName": "my-action",
  "metadata": {
    "executedAt": "2025-01-13T10:30:00.000Z",
    "inputs": {
      "message": "Hello World"
    },
    "status": "completed"
  }
}
```

## API Reference

### Endpoint Called

```
POST {baseUrl}/api/v1/action/actions/{actionName}/execute
```

### Request Payload

```json
{
  "inputs": {
    // Your input parameters
  },
  "metadata": {
    // Metadata from credentials
  },
  "stream": false
}
```

### Actions Discovery

Available actions are loaded from:

```
GET {baseUrl}/api/v1/action/actions
```

## Error Handling

- If the action fails, the node throws an error with details
- Enable **Continue On Fail** to catch errors and continue the workflow
- On error with Continue On Fail, output includes: `{ "error": "message", "actionName": "..." }`

## Examples

### Execute a Simple Action

```
Action Name: send-notification
Input Mode: Define Below
Parameters:
  - recipient: user@example.com
  - message: Your order has shipped
```

### Execute with Complex Input

```
Action Name: process-order
Input Mode: JSON
Input JSON:
{
  "orderId": "12345",
  "items": [
    {"sku": "ABC", "quantity": 2},
    {"sku": "XYZ", "quantity": 1}
  ],
  "shipping": {
    "method": "express",
    "address": "123 Main St"
  }
}
```

### Using Expressions

Reference data from previous nodes:

```
Action Name: update-record
Input Mode: Define Below
Parameters:
  - recordId: {{ $json.id }}
  - status: {{ $json.newStatus }}
  - updatedBy: {{ $('Trigger').item.json.userId }}
```
