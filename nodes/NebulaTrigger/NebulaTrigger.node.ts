import {
  IWebhookFunctions,
  INodeType,
  INodeTypeDescription,
  IWebhookResponseData,
  IDataObject,
  IHookFunctions,
} from 'n8n-workflow';

export class NebulaTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Nebula Trigger',
    name: 'nebulaTrigger',
    // Note: Custom SVG icons don't work with N8N_CUSTOM_EXTENSIONS due to n8n bug
    // See: https://github.com/n8n-io/n8n/issues/21360
    // Using Font Awesome as fallback. Install via npm for custom SVG icons.
    icon: 'fa:rocket',
    group: ['trigger'],
    version: 1,
    subtitle: 'Start workflow via Nebula',
    description: 'Starts the workflow when called from Nebula with form data. The form definition is exposed via n8n API for Nebula to fetch and present to users.',
    defaults: {
      name: 'Nebula Trigger',
    },
    // Trigger nodes have no inputs - they are workflow entry points
    inputs: [],
    outputs: ['main'],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'nebula-trigger',
        // isFullPath: false means path will be: /webhook/{workflowId}/nebula-trigger
        // When workflow is active, use /webhook/ path
        // When testing, use /webhook-test/ path
      },
    ],
    properties: [
      // --- Form Definition ---
      {
        displayName: 'Form Definition (Survey.js)',
        name: 'formJson',
        type: 'json',
        default: JSON.stringify({
          title: 'Workflow Input',
          description: 'Please provide the required input for this workflow.',
          elements: [
            {
              type: 'text',
              name: 'input',
              title: 'Input',
              description: 'Enter your input value',
              isRequired: true,
            },
          ],
        }, null, 2),
        placeholder: '{"elements": [{"type": "text", "name": "field1", "title": "Your field"}]}',
        description: 'Form definition in Survey.js JSON format. This form is exposed via n8n API for Nebula to fetch and present to users.',
        required: true,
        typeOptions: {
          rows: 15,
        },
      },
      // --- Metadata ---
      {
        displayName: 'Workflow Description',
        name: 'workflowDescription',
        type: 'string',
        default: '',
        placeholder: 'This workflow processes color preferences...',
        description: 'Human-readable description of what this workflow does. Exposed via n8n API for Nebula to display.',
        typeOptions: {
          rows: 3,
        },
      },
      {
        displayName: 'Category',
        name: 'category',
        type: 'string',
        default: '',
        placeholder: 'e.g., User Preferences, Data Processing',
        description: 'Category tag for organizing workflows in Nebula',
      },
      {
        displayName: 'Tags',
        name: 'tags',
        type: 'string',
        default: '',
        placeholder: 'e.g., color, preference, user-input',
        description: 'Comma-separated list of tags for the workflow',
      },
      // --- Response Configuration ---
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
          {
            displayName: 'Response Message',
            name: 'responseMessage',
            type: 'string',
            default: 'Workflow started successfully',
            description: 'Message returned to the caller when the webhook is triggered',
          },
          {
            displayName: 'Include Request Metadata',
            name: 'includeRequestMetadata',
            type: 'boolean',
            default: true,
            description: 'Whether to include request metadata (headers, IP, timestamp) in the workflow data',
          },
          {
            displayName: 'Validate Form Data',
            name: 'validateFormData',
            type: 'boolean',
            default: false,
            description: 'Whether to validate incoming data against required fields in the form definition',
          },
        ],
      },
    ],
  };

  // Webhook methods for managing the webhook lifecycle
  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        // For simple webhooks, we don't need to register with external services
        // The webhook is managed by n8n itself
        return true;
      },
      async create(this: IHookFunctions): Promise<boolean> {
        // Webhook is created automatically by n8n when workflow is activated
        // We can store the webhook URL in static data for reference
        const webhookUrl = this.getNodeWebhookUrl('default');
        const staticData = this.getWorkflowStaticData('node');
        staticData.webhookUrl = webhookUrl;
        return true;
      },
      async delete(this: IHookFunctions): Promise<boolean> {
        // Clean up static data when webhook is removed
        const staticData = this.getWorkflowStaticData('node');
        delete staticData.webhookUrl;
        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const req = this.getRequestObject();
    const bodyData = this.getBodyData() as IDataObject;

    // Get node parameters
    const formJsonStr = this.getNodeParameter('formJson', '') as string;
    const options = this.getNodeParameter('options', {}) as {
      responseMessage?: string;
      includeRequestMetadata?: boolean;
      validateFormData?: boolean;
    };

    // Parse form definition for validation
    let formDefinition: IDataObject = {};
    try {
      formDefinition = JSON.parse(formJsonStr);
    } catch {
      // If parsing fails, skip validation
    }

    // Optional: Validate form data against required fields
    if (options.validateFormData && formDefinition.elements) {
      const elements = formDefinition.elements as IDataObject[];
      const missingFields: string[] = [];

      for (const element of elements) {
        if (element.isRequired && element.name) {
          const fieldName = element.name as string;
          if (bodyData[fieldName] === undefined || bodyData[fieldName] === null || bodyData[fieldName] === '') {
            missingFields.push(fieldName);
          }
        }
      }

      if (missingFields.length > 0) {
        return {
          webhookResponse: {
            status: 400,
            body: {
              success: false,
              error: 'Missing required fields',
              missingFields,
            },
          },
        };
      }
    }

    // Build output data
    const outputData: IDataObject = {
      // Form data submitted by the user (main payload)
      formData: bodyData,
      // Also expose form data at root level for easier access
      ...bodyData,
    };

    // Include request metadata if enabled
    if (options.includeRequestMetadata !== false) {
      outputData.requestMetadata = {
        timestamp: new Date().toISOString(),
        method: req.method,
        headers: req.headers as IDataObject,
        ip: req.ip || req.socket?.remoteAddress,
        path: req.path,
        query: req.query as IDataObject,
      };
    }

    // Get workflow info for reference
    const workflow = this.getWorkflow();
    outputData.workflowInfo = {
      id: workflow.id,
      name: workflow.name,
    };

    // Return success response and workflow data
    return {
      webhookResponse: {
        status: 200,
        body: {
          success: true,
          message: options.responseMessage || 'Workflow started successfully',
          workflowId: workflow.id,
          workflowName: workflow.name,
        },
      },
      workflowData: [
        this.helpers.returnJsonArray([outputData]),
      ],
    };
  }
}
