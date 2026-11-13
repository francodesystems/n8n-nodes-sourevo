import type { INodeProperties } from 'n8n-workflow';

export function returnAllAndLimit(resource: string, operation: string): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: { show: { resource: [resource], operation: [operation] } },
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 50,
			description: 'Max number of results to return',
			displayOptions: {
				show: { resource: [resource], operation: [operation], returnAll: [false] },
			},
		},
	];
}

export function idField(
	resource: string,
	operations: string[],
	displayName: string,
	name: string,
	description: string,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		required: true,
		default: '',
		description,
		displayOptions: { show: { resource: [resource], operation: operations } },
	};
}

export const ACTIVITY_TYPE_OPTIONS = [
	{ name: 'Domestic', value: 'DOMESTIC' },
	{ name: 'Export', value: 'EXPORT' },
	{ name: 'Import', value: 'IMPORT' },
	{ name: 'Trade', value: 'TRADE' },
];

export const OPERATOR_ROLE_OPTIONS = [
	{ name: 'Authorised Representative', value: 'AUTHORISED_REPRESENTATIVE' },
	{ name: 'Operator', value: 'OPERATOR' },
	{ name: 'Trader', value: 'TRADER' },
];

export const DDS_STATUS_OPTIONS = [
	{ name: 'Archived', value: 'ARCHIVED' },
	{ name: 'Available', value: 'AVAILABLE' },
	{ name: 'Cancelled', value: 'CANCELLED' },
	{ name: 'Draft', value: 'DRAFT' },
	{ name: 'Grouped', value: 'GROUPED' },
	{ name: 'Obsolete', value: 'OBSOLETE' },
	{ name: 'Rejected', value: 'REJECTED' },
	{ name: 'Submitted', value: 'SUBMITTED' },
	{ name: 'Suspended', value: 'SUSPENDED' },
	{ name: 'Updated', value: 'UPDATED' },
	{ name: 'Withdrawn', value: 'WITHDRAWN' },
];
