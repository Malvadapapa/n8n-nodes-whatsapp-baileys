import {
  IWebhookFunctions,
  IWebhookResponseData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

/**
 * WhatsApp Baileys Trigger — Webhook-based trigger node that receives
 * incoming WhatsApp messages forwarded by the Bridge server.
 *
 * When a workflow with this trigger is activated, the user must register
 * this webhook URL in the Bridge server (manually or via the Action node).
 * The bridge forwards each incoming message as a POST to this webhook.
 */
export class WhatsAppBaileysTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'WhatsApp Baileys Trigger',
    name: 'whatsAppBaileysTrigger',
    icon: 'file:whatsapp-baileys.svg',
    group: ['trigger'],
    version: 1,
    subtitle: 'on new message',
    description: 'Triggers when a WhatsApp message is received via Baileys Bridge',
    defaults: {
      name: 'WhatsApp Message Received',
    },
    inputs: [],
    outputs: ['main'] as any,
    credentials: [
      {
        name: 'whatsAppBaileysApi',
        required: true,
      },
    ],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'webhook',
      },
    ],
    properties: [
      {
        displayName: 'Setup Instructions',
        name: 'setupNotice',
        type: 'notice',
        default: '',
        description:
          'After activating this workflow, register the webhook URL shown below in your Baileys Bridge server.\n\n' +
          '**Option 1 — Auto-register:** Add a "WhatsApp Baileys" action node set to "Register Webhook" before this trigger.\n\n' +
          '**Option 2 — Manual:** POST to your Bridge server:\n' +
          '```\nPOST http://bridge:3100/webhook/register\n{"url": "<webhook-url>", "id": "n8n-trigger"}\n```',
      },
      {
        displayName: 'Filter by Message Type',
        name: 'messageTypeFilter',
        type: 'multiOptions',
        options: [
          { name: 'Text', value: 'text' },
          { name: 'Image', value: 'image' },
          { name: 'Video', value: 'video' },
          { name: 'Audio', value: 'audio' },
          { name: 'Document', value: 'document' },
          { name: 'Sticker', value: 'sticker' },
          { name: 'Contact', value: 'contact' },
          { name: 'Location', value: 'location' },
        ],
        default: [],
        description: 'Only trigger on specific message types. Leave empty to trigger on all.',
      },
      {
        displayName: 'Only Direct Messages',
        name: 'onlyDirect',
        type: 'boolean',
        default: false,
        description: 'Whether to ignore group messages and only trigger on direct messages',
      },
      {
        displayName: 'Auto-Register Webhook',
        name: 'autoRegister',
        type: 'boolean',
        default: true,
        description: 'Whether to automatically register this webhook URL with the Bridge server when the workflow is activated',
      },
    ],
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const body = this.getBodyData() as {
      from?: string;
      fromName?: string;
      to?: string;
      messageId?: string;
      timestamp?: number;
      type?: string;
      body?: string;
      isGroup?: boolean;
      groupName?: string;
      hasMedia?: boolean;
      mediaType?: string;
      quotedMessage?: any;
    };

    // Apply message type filter
    const messageTypeFilter = this.getNodeParameter('messageTypeFilter', []) as string[];
    if (messageTypeFilter.length > 0 && body.type && !messageTypeFilter.includes(body.type)) {
      return { noWebhookResponse: true };
    }

    // Apply direct message filter
    const onlyDirect = this.getNodeParameter('onlyDirect', false) as boolean;
    if (onlyDirect && body.isGroup) {
      return { noWebhookResponse: true };
    }

    return {
      workflowData: [
        this.helpers.returnJsonArray([body]),
      ],
    };
  }
}
