import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { sourevoApiRequest, sourevoApiRequestAllItems } from './GenericFunctions';
import { DEFAULT_TOLERANCE_SECONDS, verifySourevoSignature } from './signature';

export const SOUREVO_WEBHOOK_EVENTS = [
	{
		name: 'DDS Item Arrived',
		value: 'dds.item_arrived',
		description: 'A supplier answered or uploaded something a DDS was waiting for',
	},
	{
		name: 'DDS Risk Status Changed',
		value: 'dds.risk_status_changed',
		description: 'The risk status of a DDS changed',
	},
	{
		name: 'DDS Status Changed',
		value: 'dds.status_changed',
		description: 'A DDS changed status (available with its reference number, rejected, withdrawn…)',
	},
	{
		name: 'DDS Submitted',
		value: 'dds.submitted',
		description: 'A DDS was submitted to TRACES',
	},
	{
		name: 'Plan Quota 100%',
		value: 'plan.quota_100',
		description: 'All the statements included in the plan are used',
	},
	{
		name: 'Plan Quota 80%',
		value: 'plan.quota_80',
		description: '80% of the statements included in the plan are used',
	},
	{
		name: 'Plot Proposal Answered',
		value: 'plot.proposal_answered',
		description: 'The supplier confirmed, corrected or rejected a plot you uploaded',
	},
	{
		name: 'Plot Satellite Flagged',
		value: 'plot.satellite_flagged',
		description: 'A satellite check found something to review on a plot',
	},
	{
		name: 'Supplier Claimed',
		value: 'supplier.claimed',
		description: 'A supplier linked its own Sourevo account',
	},
	{
		name: 'Supplier Document Uploaded',
		value: 'supplier.document_uploaded',
		description: 'A supplier uploaded a document for you to review',
	},
];

export class SourevoTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sourevo Trigger',
		name: 'sourevoTrigger',
		icon: { light: 'file:sourevo.svg', dark: 'file:sourevo.dark.svg' },
		group: ['trigger'],
		version: 1,
		// A trigger is never usable as an AI tool. n8n's type only permits `true`
		// (undefined already means "not a tool"), so we cast to declare it explicitly.
		usableAsTool: false as unknown as undefined,
		subtitle: '={{($parameter["events"] || []).join(", ")}}',
		description:
			'Starts the workflow on Sourevo webhook events. API included in the Pro, Enterprise and Forwarder plans; trial accounts work in simulated mode; packs do not include the API.',
		defaults: {
			name: 'Sourevo Trigger',
		},
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'sourevoApi',
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
				displayName:
					'Activating the workflow registers this URL in Sourevo (POST /api/v1/webhooks) and deactivating it removes it. Sourevo only calls public https URLs. Every delivery is checked against its X-Sourevo-Signature.',
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				options: SOUREVO_WEBHOOK_EVENTS,
				default: ['dds.status_changed'],
				description: 'The events that start the workflow',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Include Ping',
						name: 'includePing',
						type: 'boolean',
						default: false,
						description:
							'Whether the test ping sent from Sourevo (POST /webhooks/{ID}/test) also starts the workflow',
					},
					{
						displayName: 'Signature Tolerance (Seconds)',
						name: 'toleranceSeconds',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: DEFAULT_TOLERANCE_SECONDS,
						description:
							'Maximum age of the signature timestamp. Older deliveries are refused as possible replays.',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const { items } = await sourevoApiRequestAllItems.call(this, '/webhooks', {}, null);
				const events = [...(this.getNodeParameter('events', []) as string[])].sort();
				const found = items.find(
					(e) =>
						e.id === webhookData.webhookId &&
						e.url === webhookUrl &&
						JSON.stringify([...((e.events as string[]) ?? [])].sort()) === JSON.stringify(events),
				);
				if (found && webhookData.secret) return true;
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events', []) as string[];
				if (webhookData.webhookId) {
					// A stale registration (events changed, secret lost): replace it.
					try {
						await sourevoApiRequest.call(
							this,
							'DELETE',
							`/webhooks/${encodeURIComponent(webhookData.webhookId as string)}`,
						);
					} catch (error) {
						this.logger.debug('Sourevo Trigger: previous webhook already gone', {
							webhookId: webhookData.webhookId,
							error: (error as Error).message,
						});
					}
				}
				const { body } = await sourevoApiRequest.call(this, 'POST', '/webhooks', {
					url: webhookUrl,
					events,
					description:
						`n8n: ${this.getWorkflow().name ?? this.getWorkflow().id ?? 'workflow'}`.slice(0, 200),
				});
				if (!body.id || !body.secret) return false;
				webhookData.webhookId = body.id as string;
				webhookData.secret = body.secret as string;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId) {
					try {
						await sourevoApiRequest.call(
							this,
							'DELETE',
							`/webhooks/${encodeURIComponent(webhookData.webhookId as string)}`,
						);
					} catch (error) {
						const status = (error as { httpCode?: string }).httpCode;
						if (status !== '404') {
							this.logger.warn('Sourevo Trigger: could not delete the webhook in Sourevo', {
								webhookId: webhookData.webhookId,
								error: (error as Error).message,
							});
							return false;
						}
					}
				}
				delete webhookData.webhookId;
				delete webhookData.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookData = this.getWorkflowStaticData('node');
		const secret = (webhookData.secret as string) || '';
		const headers = this.getHeaderData() as IDataObject;
		const body = this.getBodyData() as IDataObject;
		const req = this.getRequestObject();
		const res = this.getResponseObject();

		const rawBody = (req as unknown as { rawBody?: Buffer | string }).rawBody;
		const raw =
			rawBody === undefined
				? JSON.stringify(body)
				: typeof rawBody === 'string'
					? rawBody
					: rawBody.toString('utf8');

		const options = this.getNodeParameter('options', {}) as IDataObject;
		const tolerance = (options.toleranceSeconds as number) || DEFAULT_TOLERANCE_SECONDS;
		const check = secret
			? verifySourevoSignature(
					secret,
					raw,
					headers['x-sourevo-signature'] as string | undefined,
					Math.floor(Date.now() / 1000),
					tolerance,
				)
			: ({ valid: false, reason: 'missing' } as const);
		if (!check.valid) {
			res.status(401).json({ error: `Invalid Sourevo signature (${check.reason})` });
			return { noWebhookResponse: true };
		}

		const type = (body.type as string) || (headers['x-sourevo-event'] as string) || '';
		const events = this.getNodeParameter('events', []) as string[];
		const isPing = type === 'ping';
		if (
			(isPing && options.includePing !== true) ||
			(!isPing && events.length && !events.includes(type))
		) {
			return { webhookResponse: 'OK' };
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray([
					{
						...body,
						deliveryId: headers['x-sourevo-delivery'] ?? null,
					},
				]),
			],
		};
	}
}
