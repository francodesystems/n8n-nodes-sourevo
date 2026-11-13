import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { batchFields, batchOperations } from './descriptions/BatchDescription';
import { ddsFields, ddsOperations } from './descriptions/DdsDescription';
import { plotFields, plotOperations } from './descriptions/PlotDescription';
import { productFields, productOperations } from './descriptions/ProductDescription';
import { supplierFields, supplierOperations } from './descriptions/SupplierDescription';
import {
	compact,
	dateOnly,
	idList,
	sourevoApiRequest,
	sourevoApiRequestAllItems,
	type SourevoResponse,
} from './GenericFunctions';

const enc = encodeURIComponent;

function parseJson(
	this: IExecuteFunctions,
	value: unknown,
	field: string,
	itemIndex: number,
): unknown {
	if (typeof value !== 'string') return value;
	if (!value.trim()) return undefined;
	try {
		return JSON.parse(value);
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`${field} is not valid JSON: ${(error as Error).message}`,
			{
				itemIndex,
			},
		);
	}
}

export class Sourevo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sourevo',
		name: 'sourevo',
		icon: { light: 'file:sourevo.svg', dark: 'file:sourevo.dark.svg' },
		group: ['transform'],
		version: 1,
		usableAsTool: true,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'EUDR due diligence with Sourevo: products, suppliers, plots, batches and DDS submitted to TRACES. API included in the Pro, Enterprise and Forwarder plans; trial accounts work in simulated mode; packs do not include the API.',
		defaults: {
			name: 'Sourevo',
		},
		// eslint-plugin-n8n-nodes-base@1.16.x predates NodeConnectionTypes and only
		// recognizes the 'main' string literal; the enum is the current n8n standard.
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [NodeConnectionTypes.Main],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'sourevoApi',
				required: true,
			},
		],
		properties: [
			{
				displayName:
					'The Sourevo API is available on the Pro, Enterprise and Forwarder plans. Trial accounts work in simulated mode (SIM reference numbers, nothing reaches TRACES). Packs do not include the API.',
				name: 'planNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Batch', value: 'batch' },
					{ name: 'Company', value: 'operator' },
					{ name: 'DDS (Due Diligence Statement)', value: 'dds' },
					{ name: 'Plot', value: 'plot' },
					{ name: 'Product', value: 'product' },
					{ name: 'Supplier', value: 'supplier' },
				],
				default: 'dds',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Organization, plan, mode (live, simulated or test) and API key',
						action: 'Get the account',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['operator'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Companies that submit to TRACES (operators)',
						action: 'Get many companies',
					},
				],
				default: 'getAll',
			},
			...batchOperations,
			...batchFields,
			...ddsOperations,
			...ddsFields,
			...plotOperations,
			...plotFields,
			...productOperations,
			...productFields,
			...supplierOperations,
			...supplierFields,
			{
				displayName: 'Options',
				name: 'requestOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Idempotency Key',
						name: 'idempotencyKey',
						type: 'string',
						default: '',
						description:
							'Key that makes a create or update safe to retry for 24 hours. Leave empty to generate a new one for every item.',
					},
					{
						displayName: 'Include Mode',
						name: 'includeMode',
						type: 'boolean',
						default: false,
						description:
							'Whether to add the X-Sourevo-Mode header (live, simulated or test) to each output item as sourevoMode',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getOperators(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { items } = await sourevoApiRequestAllItems.call(this, '/operators', {}, null);
				return items
					.map((o) => ({
						name: `${o.legalName as string} (${o.country as string})`,
						value: o.id as string,
					}))
					.sort((a, b) => a.name.localeCompare(b.name));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const requestOptions = this.getNodeParameter('requestOptions', i, {}) as IDataObject;
				const opts = {
					itemIndex: i,
					idempotencyKey: (requestOptions.idempotencyKey as string) || undefined,
				};

				const get = (path: string, qs: IDataObject = {}) =>
					sourevoApiRequest.call(this, 'GET', path, undefined, qs, opts);
				const post = (path: string, body: IDataObject = {}) =>
					sourevoApiRequest.call(this, 'POST', path, body, {}, opts);
				const patch = (path: string, body: IDataObject) =>
					sourevoApiRequest.call(this, 'PATCH', path, body, {}, opts);
				const del = (path: string) =>
					sourevoApiRequest.call(this, 'DELETE', path, undefined, {}, opts);
				const list = async (path: string, qs: IDataObject = {}) => {
					const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
					const limit = returnAll ? null : (this.getNodeParameter('limit', i, 50) as number);
					return sourevoApiRequestAllItems.call(this, path, compact(qs), limit, i);
				};

				let result: SourevoResponse | { items: IDataObject[]; mode: string | null };

				if (resource === 'account') {
					result = await get('/me');
				} else if (resource === 'operator') {
					result = await list('/operators');
				} else if (resource === 'product') {
					if (operation === 'create') {
						const additional = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
						result = await post('/products', {
							description: this.getNodeParameter('description', i) as string,
							...compact(additional),
						});
					} else if (operation === 'get') {
						result = await get(`/products/${enc(this.getNodeParameter('productId', i) as string)}`);
					} else {
						result = await list(
							'/products',
							this.getNodeParameter('filters', i, {}) as IDataObject,
						);
					}
				} else if (resource === 'supplier') {
					const id = () => enc(this.getNodeParameter('supplierId', i) as string);
					if (operation === 'create') {
						const additional = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
						result = await post('/suppliers', {
							name: this.getNodeParameter('name', i) as string,
							country: (this.getNodeParameter('country', i) as string).trim().toUpperCase(),
							...compact(additional),
						});
					} else if (operation === 'get') {
						result = await get(`/suppliers/${id()}`);
					} else if (operation === 'getStatus') {
						result = await get(`/suppliers/${id()}/status`);
					} else if (operation === 'invite') {
						result = await post(`/suppliers/${id()}/invitations`);
					} else if (operation === 'update') {
						const fields = compact(this.getNodeParameter('updateFields', i, {}) as IDataObject);
						if (typeof fields.country === 'string')
							fields.country = fields.country.trim().toUpperCase();
						result = await patch(`/suppliers/${id()}`, fields);
					} else {
						result = await list(
							'/suppliers',
							this.getNodeParameter('filters', i, {}) as IDataObject,
						);
					}
				} else if (resource === 'plot') {
					if (operation === 'create') {
						const supplierId = enc(this.getNodeParameter('supplierId', i) as string);
						const source = this.getNodeParameter('geometrySource', i) as string;
						const additional = compact(
							this.getNodeParameter('additionalFields', i, {}) as IDataObject,
						);
						const { format, ...rest } = additional;
						const body: IDataObject = { ...rest };
						if (typeof body.country === 'string') body.country = body.country.trim().toUpperCase();
						if (body.livestockEstablishment === false) delete body.livestockEstablishment;
						if (source === 'point') {
							body.latitude = this.getNodeParameter('latitude', i) as number;
							body.longitude = this.getNodeParameter('longitude', i) as number;
							body.areaHa = this.getNodeParameter('areaHa', i) as number;
						} else if (source === 'geojson') {
							body.geojson = parseJson.call(
								this,
								this.getNodeParameter('geojson', i),
								'GeoJSON',
								i,
							) as IDataObject;
						} else {
							const property = this.getNodeParameter('binaryPropertyName', i) as string;
							const binary = this.helpers.assertBinaryData(i, property);
							const buffer = await this.helpers.getBinaryDataBuffer(i, property);
							const extension = (
								binary.fileExtension ||
								binary.fileName?.split('.').pop() ||
								''
							).toLowerCase();
							body.file = {
								format: (format as string) || extension || 'geojson',
								content: buffer.toString('base64'),
							};
						}
						result = await post(`/suppliers/${supplierId}/plots`, body);
					} else if (operation === 'getAll') {
						const supplierId = enc(this.getNodeParameter('supplierId', i) as string);
						result = await list(`/suppliers/${supplierId}/plots`);
					} else {
						const plotId = enc(this.getNodeParameter('plotId', i) as string);
						if (operation === 'get') {
							result = await get(`/plots/${plotId}`);
						} else if (operation === 'verify') {
							result = await post(`/plots/${plotId}/verify`);
						} else if (operation === 'requestCorrection') {
							result = await post(`/plots/${plotId}/correction-request`, {
								reason: this.getNodeParameter('reason', i) as string,
							});
						} else if (operation === 'runSatelliteCheck') {
							result = await post(`/plots/${plotId}/satellite-checks`);
						} else {
							result = await get(`/plots/${plotId}/satellite-checks/latest`);
						}
					}
				} else if (resource === 'batch') {
					const id = () => enc(this.getNodeParameter('batchId', i) as string);
					if (operation === 'create') {
						const additional = compact(
							this.getNodeParameter('additionalFields', i, {}) as IDataObject,
						);
						const body: IDataObject = {
							productId: this.getNodeParameter('productId', i) as string,
						};
						const netWeightKg = this.getNodeParameter('netWeightKg', i, 0) as number;
						if (netWeightKg > 0) body.netWeightKg = netWeightKg;
						for (const [key, value] of Object.entries(additional)) {
							if (key === 'plotIds') body.plotIds = idList(value);
							else if (key === 'harvestStart' || key === 'harvestEnd') body[key] = dateOnly(value);
							else if ((key === 'volumeM3' || key === 'supplementaryUnitQuantity') && !value)
								continue;
							else body[key] = value;
						}
						result = await post('/batches', body);
					} else if (operation === 'get') {
						result = await get(`/batches/${id()}`);
					} else if (operation === 'addPlots') {
						result = await post(`/batches/${id()}/plots`, {
							plotIds: idList(this.getNodeParameter('plotIds', i)),
						});
					} else if (operation === 'removePlot') {
						result = await del(
							`/batches/${id()}/plots/${enc(this.getNodeParameter('plotId', i) as string)}`,
						);
					} else {
						result = await list('/batches', this.getNodeParameter('filters', i, {}) as IDataObject);
					}
				} else if (resource === 'dds') {
					const id = () => enc(this.getNodeParameter('ddsId', i) as string);
					const acknowledged = async (): Promise<string[]> => {
						if (this.getNodeParameter('acknowledgeAll', i, false) as boolean) {
							const check = await get(`/dds/${id()}/check`);
							const warnings = (check.body.warnings ?? []) as IDataObject[];
							return warnings.map((w) => w.key as string).filter(Boolean);
						}
						return idList(this.getNodeParameter('acknowledgedWarnings', i, ''));
					};

					if (operation === 'create') {
						const additional = compact(
							this.getNodeParameter('additionalFields', i, {}) as IDataObject,
						);
						const body: IDataObject = {
							batchId: this.getNodeParameter('batchId', i) as string,
							operatorId: this.getNodeParameter('operatorId', i) as string,
							internalReferenceNumber: this.getNodeParameter(
								'internalReferenceNumber',
								i,
							) as string,
							activityType: this.getNodeParameter('activityType', i) as string,
							operatorRole: this.getNodeParameter('operatorRole', i) as string,
							countryOfActivity: (this.getNodeParameter('countryOfActivity', i) as string)
								.trim()
								.toUpperCase(),
						};
						for (const [key, value] of Object.entries(additional)) {
							if (key === 'associatedStatements') {
								const parsed = parseJson.call(this, value, 'Associated Statements', i);
								if (Array.isArray(parsed) && parsed.length)
									body.associatedStatements = parsed as IDataObject[];
							} else if (
								key === 'representedRole' &&
								body.operatorRole !== 'AUTHORISED_REPRESENTATIVE'
							) {
								continue;
							} else {
								body[key] = value;
							}
						}
						result = await post('/dds', body);
					} else if (operation === 'get') {
						result = await get(`/dds/${id()}`);
					} else if (operation === 'update') {
						result = await patch(
							`/dds/${id()}`,
							compact(this.getNodeParameter('updateFields', i, {}) as IDataObject),
						);
					} else if (operation === 'delete') {
						result = await del(`/dds/${id()}`);
					} else if (operation === 'check') {
						const includePayload = this.getNodeParameter('includePayload', i, false) as boolean;
						result = await get(
							`/dds/${id()}/check`,
							includePayload ? { includePayload: 'true' } : {},
						);
					} else if (operation === 'riskAssessment') {
						const adoptVerdict = this.getNodeParameter('adoptVerdict', i, false) as boolean;
						const riskOptions = compact(this.getNodeParameter('riskOptions', i, {}) as IDataObject);
						const body: IDataObject = adoptVerdict
							? { adoptVerdict: true }
							: {
									conclusion: this.getNodeParameter('conclusion', i) as string,
									notes: this.getNodeParameter('notes', i) as string,
								};
						if (riskOptions.acceptGaps === true) body.acceptGaps = true;
						if (adoptVerdict && riskOptions.locale) body.locale = riskOptions.locale;
						result = await post(`/dds/${id()}/risk-assessment`, body);
					} else if (operation === 'submit') {
						result = await post(`/dds/${id()}/submit`, {
							acknowledgedWarnings: await acknowledged(),
						});
					} else if (operation === 'amend') {
						const changes = compact(this.getNodeParameter('amendFields', i, {}) as IDataObject);
						const body: IDataObject = {};
						for (const [key, value] of Object.entries(changes)) {
							if (key === 'addPlotIds' || key === 'removePlotIds') body[key] = idList(value);
							else if ((key === 'netWeightKg' || key === 'volumeM3') && !value) continue;
							else body[key] = value;
						}
						body.acknowledgedWarnings = await acknowledged();
						result = await post(`/dds/${id()}/amend`, body);
					} else if (operation === 'retract') {
						result = await post(`/dds/${id()}/retract`, {
							reason: this.getNodeParameter('reason', i) as string,
						});
					} else if (operation === 'refresh') {
						result = await post(`/dds/${id()}/refresh`);
					} else {
						const filters = { ...(this.getNodeParameter('filters', i, {}) as IDataObject) };
						if (Array.isArray(filters.status))
							filters.status = (filters.status as string[]).join(',');
						result = await list('/dds', filters);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, {
						itemIndex: i,
					});
				}

				const includeMode = requestOptions.includeMode === true;
				let rows = 'items' in result ? result.items : [result.body];
				// Adding plots answers { data: [plots], skippedDuplicates }: one item per created plot.
				if (resource === 'plot' && operation === 'create' && 'body' in result) {
					const created = Array.isArray(result.body.data)
						? (result.body.data as IDataObject[])
						: [];
					const skippedDuplicates = result.body.skippedDuplicates ?? 0;
					rows = created.length
						? created.map((plot) => ({ ...plot, skippedDuplicates }))
						: [result.body];
				}
				for (const row of rows) {
					const json = includeMode ? { ...row, sourevoMode: result.mode } : row;
					returnData.push({ json, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Request errors already are NodeApiError with the Sourevo code and the item index.
				const failure =
					error instanceof NodeApiError || error instanceof NodeOperationError
						? error
						: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
				throw failure;
			}
		}

		return [returnData];
	}
}
