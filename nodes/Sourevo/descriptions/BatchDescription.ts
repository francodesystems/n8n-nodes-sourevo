import type { INodeProperties } from 'n8n-workflow';

import { idField, returnAllAndLimit } from './common';

export const batchOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['batch'] } },
		options: [
			{
				name: 'Add Plots',
				value: 'addPlots',
				description: 'Link plots to the batch',
				action: 'Add plots to a batch',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a batch (a goods receipt) and link its plots',
				action: 'Create a batch',
			},
			{ name: 'Get', value: 'get', description: 'Get a batch', action: 'Get a batch' },
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List batches',
				action: 'Get many batches',
			},
			{
				name: 'Remove Plot',
				value: 'removePlot',
				description: 'Unlink a plot from the batch',
				action: 'Remove a plot from a batch',
			},
		],
		default: 'create',
	},
];

export const batchFields: INodeProperties[] = [
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['batch'], operation: ['create'] } },
	},
	{
		displayName: 'Net Weight (Kg)',
		name: 'netWeightKg',
		type: 'number',
		typeOptions: { minValue: 0, numberPrecision: 3 },
		default: 0,
		description:
			'Net mass in kilograms, up to 3 decimals. Net weight or volume is required; 0 means not sent.',
		displayOptions: { show: { resource: ['batch'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['batch'], operation: ['create'] } },
		options: [
			{
				displayName: 'External Reference',
				name: 'externalRef',
				type: 'string',
				default: '',
				placeholder: 'WH/IN/00012',
				description:
					'Your goods receipt ID. Sending one that already exists returns that batch with duplicate: true.',
			},
			{
				displayName: 'Harvest End',
				name: 'harvestEnd',
				type: 'dateTime',
				default: '',
				description: 'End of the time range of production',
			},
			{
				displayName: 'Harvest Start',
				name: 'harvestStart',
				type: 'dateTime',
				default: '',
				description: 'Date or start of the time range of production (EUDR art. 9.1.d).',
			},
			{
				displayName: 'Plot IDs',
				name: 'plotIds',
				type: 'string',
				default: '',
				description: 'Comma-separated plot IDs to link',
			},
			{
				displayName: 'Supplementary Unit',
				name: 'supplementaryUnit',
				type: 'string',
				default: '',
				placeholder: 'NAR',
			},
			{
				displayName: 'Supplementary Unit Quantity',
				name: 'supplementaryUnitQuantity',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Volume (M³)',
				name: 'volumeM3',
				type: 'number',
				typeOptions: { minValue: 0, numberPrecision: 3 },
				default: 0,
			},
		],
	},
	idField('batch', ['get', 'addPlots', 'removePlot'], 'Batch ID', 'batchId', 'ID of the batch'),
	{
		displayName: 'Plot IDs',
		name: 'plotIds',
		type: 'string',
		required: true,
		default: '',
		description: 'Comma-separated plot IDs to link, or an array from an expression',
		displayOptions: { show: { resource: ['batch'], operation: ['addPlots'] } },
	},
	idField('batch', ['removePlot'], 'Plot ID', 'plotId', 'ID of the plot to unlink'),
	...returnAllAndLimit('batch', 'getAll'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['batch'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'External Reference',
				name: 'externalRef',
				type: 'string',
				default: '',
				description: 'Only the batch with this ERP ID',
			},
			{
				displayName: 'Product ID',
				name: 'productId',
				type: 'string',
				default: '',
				description: 'Only batches of this product',
			},
		],
	},
];
