import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

/**
 * Credentials for connecting to the WhatsApp Baileys Bridge server.
 * The bridge server must be running and accessible for the n8n nodes to work.
 */
export class WhatsAppBaileysApi implements ICredentialType {
  name = 'whatsAppBaileysApi';
  displayName = 'WhatsApp Baileys API';
  documentationUrl = 'https://github.com/user/n8n-nodes-whatsapp-baileys';

  properties: INodeProperties[] = [
    {
      displayName: 'Bridge Server URL',
      name: 'bridgeUrl',
      type: 'string',
      default: 'http://localhost:3100',
      placeholder: 'http://localhost:3100',
      description: 'URL of the WhatsApp Baileys Bridge server',
      required: true,
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'Optional API key for authenticating with the bridge server. Leave empty if no API key is configured.',
      required: false,
    },
  ];
}
