import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

/**
 * WhatsApp Baileys Node — Action node for sending messages and checking
 * status through the Baileys Bridge server.
 */
export class WhatsAppBaileys implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'WhatsApp Baileys',
    name: 'whatsAppBaileys',
    icon: 'file:whatsapp-baileys.svg',
    group: ['output'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Send WhatsApp messages via Baileys Bridge',
    defaults: {
      name: 'WhatsApp Baileys',
    },
    inputs: ['main'] as any,
    outputs: ['main'] as any,
    credentials: [
      {
        name: 'whatsAppBaileysApi',
        required: true,
      },
    ],
    properties: [
      // ─── Operation ────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Send Text', value: 'sendText', description: 'Send a text message', action: 'Send a text message' },
          { name: 'Send Image', value: 'sendImage', description: 'Send an image with optional caption', action: 'Send an image' },
          { name: 'Send Document', value: 'sendDocument', description: 'Send a file/document', action: 'Send a document' },
          { name: 'Send Location', value: 'sendLocation', description: 'Send a GPS location', action: 'Send a location' },
          { name: 'Send Contact', value: 'sendContact', description: 'Send a contact vCard', action: 'Send a contact' },
          { name: 'Reply to Message', value: 'sendReply', description: 'Reply to a message by quoting it', action: 'Reply to a message' },
          { name: 'Get Status', value: 'getStatus', description: 'Get WhatsApp connection status', action: 'Get connection status' },
          { name: 'Get QR Code', value: 'getQR', description: 'Get QR code for authentication', action: 'Get QR code' },
        ],
        default: 'sendText',
      },

      // ─── To (Phone Number) ───────────────────────────────────
      {
        displayName: 'Phone Number',
        name: 'to',
        type: 'string',
        required: true,
        default: '',
        placeholder: '5491112345678',
        description: 'Recipient phone number with country code (no + or spaces). E.g. 5491112345678',
        displayOptions: {
          show: {
            operation: ['sendText', 'sendImage', 'sendDocument', 'sendLocation', 'sendContact', 'sendReply'],
          },
        },
      },

      // ─── Message Text ────────────────────────────────────────
      {
        displayName: 'Message',
        name: 'message',
        type: 'string',
        typeOptions: { rows: 4 },
        required: true,
        default: '',
        description: 'The text message to send',
        displayOptions: {
          show: {
            operation: ['sendText', 'sendReply'],
          },
        },
      },

      // ─── Image Fields ────────────────────────────────────────
      {
        displayName: 'Image URL',
        name: 'imageUrl',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'https://example.com/image.jpg',
        description: 'URL of the image to send',
        displayOptions: {
          show: { operation: ['sendImage'] },
        },
      },
      {
        displayName: 'Caption',
        name: 'caption',
        type: 'string',
        default: '',
        description: 'Optional caption for the image',
        displayOptions: {
          show: { operation: ['sendImage'] },
        },
      },

      // ─── Document Fields ─────────────────────────────────────
      {
        displayName: 'Document URL',
        name: 'documentUrl',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'https://example.com/file.pdf',
        description: 'URL of the document to send',
        displayOptions: {
          show: { operation: ['sendDocument'] },
        },
      },
      {
        displayName: 'Filename',
        name: 'filename',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'report.pdf',
        description: 'Filename shown to the recipient',
        displayOptions: {
          show: { operation: ['sendDocument'] },
        },
      },
      {
        displayName: 'MIME Type',
        name: 'mimetype',
        type: 'string',
        default: 'application/octet-stream',
        description: 'MIME type of the document',
        displayOptions: {
          show: { operation: ['sendDocument'] },
        },
      },

      // ─── Location Fields ─────────────────────────────────────
      {
        displayName: 'Latitude',
        name: 'latitude',
        type: 'number',
        required: true,
        default: 0,
        description: 'Latitude coordinate',
        displayOptions: {
          show: { operation: ['sendLocation'] },
        },
      },
      {
        displayName: 'Longitude',
        name: 'longitude',
        type: 'number',
        required: true,
        default: 0,
        description: 'Longitude coordinate',
        displayOptions: {
          show: { operation: ['sendLocation'] },
        },
      },
      {
        displayName: 'Location Name',
        name: 'locationName',
        type: 'string',
        default: '',
        description: 'Optional name for the location',
        displayOptions: {
          show: { operation: ['sendLocation'] },
        },
      },

      // ─── Contact Fields ──────────────────────────────────────
      {
        displayName: 'Contact Name',
        name: 'contactName',
        type: 'string',
        required: true,
        default: '',
        description: 'Display name for the contact',
        displayOptions: {
          show: { operation: ['sendContact'] },
        },
      },
      {
        displayName: 'Contact Phone',
        name: 'contactPhone',
        type: 'string',
        required: true,
        default: '',
        description: 'Phone number of the contact to share',
        displayOptions: {
          show: { operation: ['sendContact'] },
        },
      },

      // ─── Reply Fields ────────────────────────────────────────
      {
        displayName: 'Quoted Message ID',
        name: 'quotedMessageId',
        type: 'string',
        required: true,
        default: '',
        description: 'ID of the message to quote/reply to (from trigger output)',
        displayOptions: {
          show: { operation: ['sendReply'] },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const credentials = await this.getCredentials('whatsAppBaileysApi');
    const bridgeUrl = (credentials.bridgeUrl as string).replace(/\/$/, '');
    const apiKey = credentials.apiKey as string;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        let response: any;

        switch (operation) {
          case 'sendText': {
            const to = this.getNodeParameter('to', i) as string;
            const message = this.getNodeParameter('message', i) as string;
            response = await this.helpers.httpRequest({
              method: 'POST',
              url: `${bridgeUrl}/send/text`,
              body: { to, message },
              headers,
              json: true,
            });
            break;
          }

          case 'sendImage': {
            const to = this.getNodeParameter('to', i) as string;
            const imageUrl = this.getNodeParameter('imageUrl', i) as string;
            const caption = this.getNodeParameter('caption', i) as string;
            response = await this.helpers.httpRequest({
              method: 'POST',
              url: `${bridgeUrl}/send/image`,
              body: { to, imageUrl, caption },
              headers,
              json: true,
            });
            break;
          }

          case 'sendDocument': {
            const to = this.getNodeParameter('to', i) as string;
            const documentUrl = this.getNodeParameter('documentUrl', i) as string;
            const filename = this.getNodeParameter('filename', i) as string;
            const mimetype = this.getNodeParameter('mimetype', i) as string;
            response = await this.helpers.httpRequest({
              method: 'POST',
              url: `${bridgeUrl}/send/document`,
              body: { to, documentUrl, filename, mimetype },
              headers,
              json: true,
            });
            break;
          }

          case 'sendLocation': {
            const to = this.getNodeParameter('to', i) as string;
            const latitude = this.getNodeParameter('latitude', i) as number;
            const longitude = this.getNodeParameter('longitude', i) as number;
            const locationName = this.getNodeParameter('locationName', i) as string;
            response = await this.helpers.httpRequest({
              method: 'POST',
              url: `${bridgeUrl}/send/location`,
              body: { to, latitude, longitude, name: locationName },
              headers,
              json: true,
            });
            break;
          }

          case 'sendContact': {
            const to = this.getNodeParameter('to', i) as string;
            const contactName = this.getNodeParameter('contactName', i) as string;
            const contactPhone = this.getNodeParameter('contactPhone', i) as string;
            response = await this.helpers.httpRequest({
              method: 'POST',
              url: `${bridgeUrl}/send/contact`,
              body: { to, contactName, contactPhone },
              headers,
              json: true,
            });
            break;
          }

          case 'sendReply': {
            const to = this.getNodeParameter('to', i) as string;
            const message = this.getNodeParameter('message', i) as string;
            const quotedMessageId = this.getNodeParameter('quotedMessageId', i) as string;
            response = await this.helpers.httpRequest({
              method: 'POST',
              url: `${bridgeUrl}/send/reply`,
              body: { to, message, quotedMessageId },
              headers,
              json: true,
            });
            break;
          }

          case 'getStatus': {
            response = await this.helpers.httpRequest({
              method: 'GET',
              url: `${bridgeUrl}/status`,
              headers,
              json: true,
            });
            break;
          }

          case 'getQR': {
            response = await this.helpers.httpRequest({
              method: 'GET',
              url: `${bridgeUrl}/qr/raw`,
              headers,
              json: true,
            });
            break;
          }
        }

        returnData.push({ json: response });
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: error.message } });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
