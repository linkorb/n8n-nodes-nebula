import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class NebulaApi implements ICredentialType {
  name = 'nebulaApi';
  displayName = 'Nebula API';
  documentationUrl = 'https://github.com/linkorb/n8n-nodes-nebula';
  // Note: Custom SVG icons don't work with N8N_CUSTOM_EXTENSIONS due to n8n bug
  // See: https://github.com/n8n-io/n8n/issues/21360
  // Using Font Awesome as fallback. Install via npm for custom SVG icons.
  icon = 'fa:circle-nodes' as const;

  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: '',
      placeholder: 'https://api.example.com',
      description: 'The base URL of your Nebula API backend',
      required: true,
    },
    {
      displayName: 'Username',
      name: 'username',
      type: 'string',
      default: '',
      description: 'Username for authentication with the API',
      required: true,
    },
    {
      displayName: 'Password',
      name: 'password',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Password for authentication with the API',
      required: true,
    },
    {
      displayName: 'Metadata',
      name: 'metadata',
      type: 'json',
      default: '{}',
      description: 'Additional JSON metadata to include with all requests (e.g., tenant ID, environment)',
      placeholder: '{"tenantId": "abc123", "environment": "production"}',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      auth: {
        username: '={{$credentials.username}}',
        password: '={{$credentials.password}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/health',
      method: 'GET',
    },
  };
}

