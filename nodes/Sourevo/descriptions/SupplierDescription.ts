import type { INodeProperties } from 'n8n-workflow';

import { idField, returnAllAndLimit } from './common';

export const supplierOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['supplier'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a supplier',
				action: 'Create a supplier',
			},
			{ name: 'Get', value: 'get', description: 'Get a supplier', action: 'Get a supplier' },
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List suppliers',
				action: 'Get many suppliers',
			},
			{
				name: 'Get Status',
				value: 'getStatus',
				description: 'Trust level, plots summary, account, invitation and risk scorecard',
				action: 'Get the status of a supplier',
			},
			{
				name: 'Invite',
				value: 'invite',
				description: 'Invite the supplier to its portal (emailed when it has an address)',
				action: 'Invite a supplier to its portal',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a supplier your organization owns',
				action: 'Update a supplier',
			},
		],
		default: 'create',
	},
];

const supplierDetailFields: INodeProperties[] = [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
	},
	{
		displayName: 'External Reference',
		name: 'externalRef',
		type: 'string',
		default: '',
		description:
			'Your ERP ID for the supplier. Creating with one that already exists returns that supplier with duplicate: true.',
	},
	{
		displayName: 'Legal Name',
		name: 'legalName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Postal Address',
		name: 'postalAddress',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Tax ID',
		name: 'taxId',
		type: 'string',
		default: '',
		description: 'VAT, CNPJ, NIT… checked against the format of the country',
	},
];

export const supplierFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['supplier'], operation: ['create'] } },
	},
	{
		displayName: 'Country',
		name: 'country',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'BR',
		description: 'ISO 3166-1 alpha-2 country code',
		displayOptions: { show: { resource: ['supplier'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['supplier'], operation: ['create'] } },
		options: supplierDetailFields,
	},
	idField(
		'supplier',
		['get', 'getStatus', 'invite', 'update'],
		'Supplier ID',
		'supplierId',
		'ID of the supplier',
	),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['supplier'], operation: ['update'] } },
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'ISO 3166-1 alpha-2 country code',
			},
			...supplierDetailFields,
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
		],
	},
	...returnAllAndLimit('supplier', 'getAll'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['supplier'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'External Reference',
				name: 'externalRef',
				type: 'string',
				default: '',
				description: 'Only the supplier with this ERP ID',
			},
		],
	},
];
