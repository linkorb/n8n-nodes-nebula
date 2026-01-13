import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

/**
 * NebulaTriggerAuth - Authentication credential for incoming webhook requests
 *
 * This is used to authenticate CALLERS to the Nebula Trigger webhook.
 * It is distinctly different from NebulaApi credentials which authenticate
 * outbound requests FROM n8n TO Nebula.
 */
export class NebulaTriggerAuth implements ICredentialType {
  name = 'nebulaTriggerAuth';
  displayName = 'Nebula Trigger Auth';
  documentationUrl = 'https://github.com/linkorb/n8n-nodes-nebula';
  // Note: Custom SVG icons don't work with N8N_CUSTOM_EXTENSIONS due to n8n bug
  // See: https://github.com/n8n-io/n8n/issues/21360
  // Using Font Awesome as fallback. Install via npm for custom SVG icons.
  icon = 'fa:key' as const;

  properties: INodeProperties[] = [
    {
      displayName: 'Token',
      name: 'token',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Bearer token that callers must provide to authenticate webhook requests. Callers should include this in the Authorization header as "Bearer {token}".',
      required: true,
    },
  ];
}
