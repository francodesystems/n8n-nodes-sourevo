import type { INodeProperties } from 'n8n-workflow';

import { idField, returnAllAndLimit } from './common';

export const productOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['product'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a product with its CN code (scientific name for wood)',
				action: 'Create a product',
			},
			{ name: 'Get', value: 'get', description: 'Get a product', action: 'Get a product' },
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List products',
				action: 'Get many products',
			},
		],
		default: 'create',
	},
];

export const productFields: INodeProperties[] = [
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'Green coffee beans, arabica',
		description: 'Trade description of the product (up to 150 characters)',
		displayOptions: { show: { resource: ['product'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['product'], operation: ['create'] } },
		options: [
			{
				displayName: 'CN Code',
				name: 'cnCode',
				type: 'string',
				default: '',
				placeholder: '0901 11 00',
				description: 'Combined Nomenclature code, 4 to 8 digits',
			},
			{
				displayName: 'Common Name',
				name: 'commonName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'External Reference',
				name: 'externalRef',
				type: 'string',
				default: '',
				description:
					'Your ERP ID for the product. Sending one that already exists returns that product with duplicate: true.',
			},
			{
				displayName: 'HS Heading',
				name: 'hsHeading',
				type: 'string',
				default: '',
				placeholder: '0901',
				description: 'Four-digit HS heading, only when you do not send a CN code',
			},
			{
				displayName: 'Scientific Name',
				name: 'scientificName',
				type: 'string',
				default: '',
				description: 'Required for wood products',
			},
		],
	},
	idField('product', ['get'], 'Product ID', 'productId', 'ID of the product'),
	...returnAllAndLimit('product', 'getAll'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['product'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'External Reference',
				name: 'externalRef',
				type: 'string',
				default: '',
				description: 'Only the product with this ERP ID',
			},
		],
	},
];
