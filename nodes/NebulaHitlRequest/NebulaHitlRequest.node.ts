import {
  IExecuteFunctions,
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
  IWebhookFunctions,
  IWebhookResponseData,
  IDataObject,
  NodeApiError,
} from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

export class NebulaHitlRequest implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Nebula HITL Request',
    name: 'nebulaHitlRequest',
    // Note: Custom SVG icons don't work with N8N_CUSTOM_EXTENSIONS due to n8n bug
    // See: https://github.com/n8n-io/n8n/issues/21360
    // Using Font Awesome as fallback. Install via npm for custom SVG icons.
    icon: 'fa:user-clock',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Send Human-in-the-Loop requests via Nebula and wait for responses',
    defaults: {
      name: 'Nebula HITL Request',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'nebulaApi',
        required: true,
      },
    ],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'nebula-hitl-response',
        restartWebhook: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'HITL Request',
            value: 'hitlRequest',
            description: 'Create a Human-in-the-Loop request and wait for response',
            action: 'Create a HITL request and wait for response',
          },
        ],
        default: 'hitlRequest',
      },
      {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        default: '',
        placeholder: 'Approval Required',
        description: 'A short title for the HITL request',
        required: true,
        displayOptions: {
          show: {
            operation: ['hitlRequest'],
          },
        },
      },
      {
        displayName: 'Message',
        name: 'message',
        type: 'string',
        typeOptions: {
          rows: 6,
        },
        default: '',
        placeholder: 'Please review the following information and provide your approval...',
        description: 'A detailed message in Markdown format',
        required: true,
        displayOptions: {
          show: {
            operation: ['hitlRequest'],
          },
        },
      },
      {
        displayName: 'Response Type',
        name: 'responseType',
        type: 'options',
        options: [
          {
            name: 'Ok',
            value: 'ok',
            description: 'Simple acknowledgement with an OK button',
          },
          {
            name: 'Yes/No',
            value: 'yesno',
            description: 'Binary choice between Yes and No',
          },
          {
            name: 'Text',
            value: 'text',
            description: 'Free-form text input',
          },
          {
            name: 'Form (survey.json)',
            value: 'form',
            description: 'Custom form defined as survey.json JSON format',
          },
        ],
        default: 'ok',
        description: 'The type of response expected from the human',
        displayOptions: {
          show: {
            operation: ['hitlRequest'],
          },
        },
      },
      {
        displayName: 'Form JSON',
        name: 'formJson',
        type: 'json',
        default: '{\n  "elements": [\n    {\n      "type": "radiogroup",\n      "name": "decision",\n      "title": "Please select an option",\n      "choices": ["Approve", "Reject", "Need More Info"]\n    }\n  ]\n}',
        placeholder: '{"elements": [{"type": "text", "name": "comment", "title": "Your comment"}]}',
        description: 'Form definition in survey.json JSON format',
        displayOptions: {
          show: {
            operation: ['hitlRequest'],
            responseType: ['form'],
          },
        },
      },
      {
        displayName: 'Additional Data',
        name: 'additionalData',
        type: 'json',
        default: '{}',
        description: 'Additional JSON data to include with the request',
        displayOptions: {
          show: {
            operation: ['hitlRequest'],
          },
        },
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        displayOptions: {
          show: {
            operation: ['hitlRequest'],
          },
        },
        options: [
          {
            displayName: 'Priority',
            name: 'priority',
            type: 'options',
            options: [
              { name: 'Low', value: 'low' },
              { name: 'Normal', value: 'normal' },
              { name: 'High', value: 'high' },
              { name: 'Urgent', value: 'urgent' },
            ],
            default: 'normal',
            description: 'Priority level of the request',
          },
          {
            displayName: 'Timeout (Minutes)',
            name: 'timeoutMinutes',
            type: 'number',
            default: 0,
            description:
              'Timeout in minutes after which the workflow continues with a timeout response (0 = wait indefinitely)',
            typeOptions: {
              minValue: 0,
            },
          },
          {
            displayName: 'Assignee',
            name: 'assignee',
            type: 'string',
            default: '',
            description: 'Email or ID of the person to assign this request to',
          },
          {
            displayName: 'Tags',
            name: 'tags',
            type: 'string',
            default: '',
            description: 'Comma-separated list of tags',
          },
        ],
      },
    ],
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const bodyData = this.getBodyData();

    // Validate the incoming webhook has required data
    if (!bodyData.requestId) {
      return {
        webhookResponse: {
          status: 400,
          body: { error: 'Missing requestId in webhook payload' },
        },
      };
    }

    // Return the response data to continue the workflow
    // The webhook data becomes the output of the node
    return {
      webhookResponse: {
        status: 200,
        body: { success: true, message: 'Response received, workflow will continue' },
      },
      workflowData: [
        [
          {
            json: {
              requestId: bodyData.requestId,
              response: bodyData.response,
              responseValue: bodyData.responseValue,
              respondedBy: bodyData.respondedBy,
              respondedAt: bodyData.respondedAt || new Date().toISOString(),
              comment: bodyData.comment,
              data: bodyData.data || {},
            },
          },
        ],
      ],
    };
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();

    // Check if we're resuming from a webhook (execution was waiting)
    const waitingWebhookData = this.getInputData();
    
    // If we have webhook response data (resuming), pass it through
    // This happens when the webhook is called and the execution resumes
    if (
      waitingWebhookData.length > 0 &&
      waitingWebhookData[0].json.requestId &&
      waitingWebhookData[0].json.response !== undefined
    ) {
      // We're resuming from webhook - return the webhook data as output
      return [waitingWebhookData];
    }

    const operation = this.getNodeParameter('operation', 0) as string;

    if (operation === 'hitlRequest') {
      // Process only the first item for the request
      // (HITL requests typically handle one request at a time)
      const itemIndex = 0;

      try {
        const credentials = await this.getCredentials('nebulaApi');
        const baseUrl = (credentials.baseUrl as string).replace(/\/$/, ''); // Remove trailing slash

        // Parse metadata from credentials
        let metadata: IDataObject = {};
        try {
          metadata = credentials.metadata ? JSON.parse(credentials.metadata as string) : {};
        } catch {
          // Use empty object if parsing fails
        }

        // Get parameters
        const title = this.getNodeParameter('title', itemIndex) as string;
        const message = this.getNodeParameter('message', itemIndex) as string;
        const responseType = this.getNodeParameter('responseType', itemIndex) as string;
        const additionalDataStr = this.getNodeParameter('additionalData', itemIndex, '{}') as string;
        const options = this.getNodeParameter('options', itemIndex, {}) as {
          priority?: string;
          timeoutMinutes?: number;
          assignee?: string;
          tags?: string;
        };

        // Get form JSON if response type is form
        let form: IDataObject = {};
        if (responseType === 'form') {
          const formJsonStr = this.getNodeParameter('formJson', itemIndex, '{}') as string;
          try {
            form = JSON.parse(formJsonStr);
          } catch {
            // Use empty object if parsing fails
          }
        }

        // Generate unique request ID
        const requestId = uuidv4();

        // Construct the webhook URL using n8n's built-in instance base URL
        // The webhook path is defined in the node description as 'nebula-hitl-response'
        const n8nBaseUrl = this.getInstanceBaseUrl().replace(/\/$/, '');
        const executionId = this.getExecutionId();
        
        // n8n webhook URL format for waiting executions: {baseUrl}/webhook-waiting/{executionId}/nebula-hitl-response
        const webhookUrl = `${n8nBaseUrl}/webhook-waiting/${executionId}/nebula-hitl-response`;

        // Parse additional data
        let parsedAdditionalData: IDataObject = {};
        try {
          parsedAdditionalData = JSON.parse(additionalDataStr);
        } catch {
          // If parsing fails, use empty object
        }

        // Store incoming item data for reference
        const inputItemData = items[itemIndex]?.json || {};

        // Get workflow info
        const workflow = this.getWorkflow();

        // Build request payload
        const payload = {
          requestId,
          title,
          message,
          responseType,
          form: responseType === 'form' ? form : undefined,
          webhookUrl, // The URL the backend should POST to when responding
          priority: options.priority || 'normal',
          timeoutMinutes: options.timeoutMinutes || 0,
          assignee: options.assignee || undefined,
          tags: options.tags ? options.tags.split(',').map((t) => t.trim()) : [],
          metadata,
          additionalData: parsedAdditionalData,
          inputData: inputItemData,
          workflowId: workflow.id,
          workflowName: workflow.name,
          executionId,
          createdAt: new Date().toISOString(),
        };

        // Make HTTP POST request to create the HITL request
        try {
          await this.helpers.httpRequest({
            method: 'POST',
            url: `${baseUrl}/requests`,
            body: payload,
            json: true,
            auth: {
              username: credentials.username as string,
              password: credentials.password as string,
            },
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } catch (error) {
          throw new NodeApiError(this.getNode(), { error: (error as Error).message }, {
            message: 'Failed to create HITL request on the Nebula server',
          });
        }

        // Calculate the wait timeout
        const timeoutMinutes = options.timeoutMinutes || 0;
        let waitTill: Date;
        
        if (timeoutMinutes > 0) {
          // Wait until the specified timeout
          waitTill = new Date(Date.now() + timeoutMinutes * 60 * 1000);
        } else {
          // Wait indefinitely (max date - n8n will handle this)
          // Set to 1 year from now as "indefinite"
          waitTill = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        }

        // Store request info in static data for potential reference
        const staticData = this.getWorkflowStaticData('node');
        staticData.currentRequest = {
          requestId,
          title,
          webhookUrl,
          createdAt: payload.createdAt,
          waitTill: waitTill.toISOString(),
        };

        // PUT THE EXECUTION TO WAIT!
        // This is the key - it pauses the workflow until the webhook is called
        // or the timeout is reached
        await this.putExecutionToWait(waitTill);

        // This code is reached when the execution resumes (either from webhook or timeout)
        // However, in practice, when webhook is called, n8n handles the resume differently
        // Return empty - the webhook handler will provide the actual output
        return [[]];

      } catch (error) {
        if (this.continueOnFail()) {
          return [
            [
              {
                json: {
                  error: (error as Error).message,
                },
                pairedItem: { item: itemIndex },
              },
            ],
          ];
        }
        throw error;
      }
    }

    // Default return for unknown operations
    return [[]];
  }
}

