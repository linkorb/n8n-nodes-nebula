import {
  IExecuteFunctions,
  INodeType,
  INodeTypeDescription,
  INodeExecutionData,
  IDataObject,
  ILoadOptionsFunctions,
  INodePropertyOptions,
  NodeApiError,
  NodeOperationError,
} from 'n8n-workflow';

export class NebulaAction implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Nebula Action',
    name: 'nebulaAction',
    // Note: Custom SVG icons don't work with N8N_CUSTOM_EXTENSIONS due to n8n bug
    // See: https://github.com/n8n-io/n8n/issues/21360
    // Using Font Awesome as fallback. Install via npm for custom SVG icons.
    icon: 'fa:play-circle',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["actionName"]}}',
    description: 'Execute Nebula Actions via the Nebula API',
    defaults: {
      name: 'Nebula Action',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'nebulaApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Action Name',
        name: 'actionName',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'getActions',
        },
        default: '',
        required: true,
        description: 'The Nebula Action to execute. Choose from the list or specify an ID using an expression.',
      },
      {
        displayName: 'To view input arguments, open your Nebula base URL + <code>/action/actions/{action-name}</code> in your browser',
        name: 'documentationNotice',
        type: 'notice',
        default: '',
        displayOptions: {
          hide: {
            actionName: [''],
          },
        },
      },
      {
        displayName: 'Input Mode',
        name: 'inputMode',
        type: 'options',
        options: [
          {
            name: 'Define Below',
            value: 'define',
            description: 'Define input parameters below',
          },
          {
            name: 'JSON',
            value: 'json',
            description: 'Provide input as raw JSON',
          },
        ],
        default: 'define',
        description: 'How to specify the input parameters for the action',
      },
      {
        displayName: 'Input Parameters',
        name: 'inputParameters',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
          sortable: true,
        },
        default: {},
        placeholder: 'Add Parameter',
        description: 'Input parameters to send to the action',
        displayOptions: {
          show: {
            inputMode: ['define'],
          },
        },
        options: [
          {
            name: 'parameters',
            displayName: 'Parameters',
            values: [
              {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                default: '',
                placeholder: 'e.g., message',
                description: 'The parameter name',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                placeholder: 'e.g., Hello World',
                description: 'The parameter value. Use expressions to reference data from previous nodes.',
              },
            ],
          },
        ],
      },
      {
        displayName: 'Input JSON',
        name: 'inputJson',
        type: 'json',
        default: '{}',
        placeholder: '{\n  "message": "Hello World",\n  "count": 5\n}',
        description: 'JSON object containing input parameters for the action',
        displayOptions: {
          show: {
            inputMode: ['json'],
          },
        },
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
          {
            displayName: 'Timeout (Seconds)',
            name: 'timeout',
            type: 'number',
            default: 30,
            description: 'Timeout in seconds for the action execution',
            typeOptions: {
              minValue: 1,
              maxValue: 300,
            },
          },
          {
            displayName: 'Include Metadata',
            name: 'includeMetadata',
            type: 'boolean',
            default: false,
            description: 'Whether to include action metadata in the output',
          },
        ],
      },
    ],
  };

  methods = {
    loadOptions: {
      async getActions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        try {
          const credentials = await this.getCredentials('nebulaApi');
          const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

          const response = await this.helpers.httpRequest({
            method: 'GET',
            url: `${baseUrl}/api/v1/action/actions`,
            json: true,
            auth: {
              username: credentials.username as string,
              password: credentials.password as string,
            },
          });

          // Handle both array response and object with 'actions' property
          const actions = Array.isArray(response) ? response : (response.actions || response.data || []);

          return actions.map((action: IDataObject) => ({
            name: (action.label || action.name || action.id) as string,
            value: (action.name || action.id) as string,
            description: (action.description || '') as string,
          }));
        } catch (error) {
          // Return empty array on error - n8n will show "No options available"
          return [];
        }
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const credentials = await this.getCredentials('nebulaApi');
        const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

        // Get the action name
        const actionName = this.getNodeParameter('actionName', itemIndex) as string;

        if (!actionName) {
          throw new NodeOperationError(this.getNode(), 'Action name is required', { itemIndex });
        }

        // Build the input payload
        const inputMode = this.getNodeParameter('inputMode', itemIndex) as string;
        let inputPayload: IDataObject = {};

        if (inputMode === 'json') {
          const inputJsonStr = this.getNodeParameter('inputJson', itemIndex, '{}') as string;
          try {
            inputPayload = JSON.parse(inputJsonStr);
          } catch {
            throw new NodeOperationError(this.getNode(), 'Invalid JSON in Input JSON field', { itemIndex });
          }
        } else {
          // Build from key-value pairs
          const inputParameters = this.getNodeParameter('inputParameters', itemIndex, {}) as {
            parameters?: Array<{ name: string; value: string }>;
          };

          if (inputParameters.parameters && inputParameters.parameters.length > 0) {
            for (const param of inputParameters.parameters) {
              if (param.name) {
                // Try to parse value as JSON for nested objects/arrays
                try {
                  inputPayload[param.name] = JSON.parse(param.value);
                } catch {
                  // Use as string if not valid JSON
                  inputPayload[param.name] = param.value;
                }
              }
            }
          }
        }

        // Get options
        const options = this.getNodeParameter('options', itemIndex, {}) as {
          timeout?: number;
          includeMetadata?: boolean;
        };

        // Parse metadata from credentials
        let metadata: IDataObject = {};
        try {
          metadata = credentials.metadata ? JSON.parse(credentials.metadata as string) : {};
        } catch {
          // Use empty object if parsing fails
        }

        // Build the request payload
        const requestPayload = {
          inputs: inputPayload,
          metadata,
          stream: false, // Non-streaming execution
        };

        // Set timeout (default 30 seconds)
        const timeoutMs = (options.timeout || 30) * 1000;

        // Make the API call to execute the action
        const response = await this.helpers.httpRequest({
          method: 'POST',
          url: `${baseUrl}/api/v1/action/actions/${encodeURIComponent(actionName)}/execute`,
          body: requestPayload,
          json: true,
          auth: {
            username: credentials.username as string,
            password: credentials.password as string,
          },
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: timeoutMs,
        });

        // Build the output
        const outputData: IDataObject = {};

        // Extract the output from the response
        // Handle different response structures
        if (response.output !== undefined) {
          outputData.output = response.output;
        } else if (response.result !== undefined) {
          outputData.output = response.result;
        } else if (response.data !== undefined) {
          outputData.output = response.data;
        } else {
          // Use the entire response as output
          outputData.output = response;
        }

        // Include action name for reference
        outputData.actionName = actionName;

        // Include metadata if requested
        if (options.includeMetadata) {
          outputData.metadata = {
            executedAt: new Date().toISOString(),
            inputs: inputPayload,
            status: response.status || 'completed',
          };
        }

        returnData.push({
          json: outputData,
          pairedItem: { item: itemIndex },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: (error as Error).message,
              actionName: this.getNodeParameter('actionName', itemIndex, '') as string,
            },
            pairedItem: { item: itemIndex },
          });
          continue;
        }
        throw new NodeApiError(this.getNode(), { error: (error as Error).message }, {
          message: `Failed to execute Nebula Action: ${(error as Error).message}`,
          itemIndex,
        });
      }
    }

    return [returnData];
  }
}
