import type { INodeProperties } from 'n8n-workflow';

import {
	ACTIVITY_TYPE_OPTIONS,
	DDS_STATUS_OPTIONS,
	OPERATOR_ROLE_OPTIONS,
	idField,
	returnAllAndLimit,
} from './common';

export const ddsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['dds'] } },
		options: [
			{
				name: 'Amend',
				value: 'amend',
				description: 'Amend a submitted DDS in TRACES',
				action: 'Amend a DDS',
			},
			{
				name: 'Check',
				value: 'check',
				description: 'Pre-submission check: blocking issues, warnings to acknowledge and advice',
				action: 'Check a DDS before submitting',
			},
			{
				name: 'Create Draft',
				value: 'create',
				description: 'Create a draft due diligence statement from a batch',
				action: 'Create a DDS draft',
			},
			{
				name: 'Delete Draft',
				value: 'delete',
				description: 'Delete a draft',
				action: 'Delete a DDS draft',
			},
			{
				name: 'Get',
				value: 'get',
				description:
					'Get a DDS with its status, reference and verification numbers, and risk status',
				action: 'Get a DDS',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List due diligence statements',
				action: 'Get many DDS',
			},
			{
				name: 'Refresh',
				value: 'refresh',
				description: 'Ask TRACES for the current status now',
				action: 'Refresh a DDS from TRACES',
			},
			{
				name: 'Retract',
				value: 'retract',
				description: 'Withdraw a submitted DDS in TRACES',
				action: 'Retract a DDS',
			},
			{
				name: 'Set Risk Assessment',
				value: 'riskAssessment',
				description: 'Record the risk assessment conclusion of a draft',
				action: 'Set the risk assessment of a DDS',
			},
			{
				name: 'Submit',
				value: 'submit',
				description: 'Submit the DDS to TRACES (simulated during the trial)',
				action: 'Submit a DDS',
			},
			{
				name: 'Update Draft',
				value: 'update',
				description: 'Change a draft',
				action: 'Update a DDS draft',
			},
		],
		default: 'create',
	},
];

const acknowledgeFields = (operation: string): INodeProperties[] => [
	{
		displayName:
			'Acknowledging a warning is recorded as acting under your own responsibility. Send only the warning keys you have reviewed.',
		name: 'acknowledgeNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { resource: ['dds'], operation: [operation] } },
	},
	{
		displayName: 'Acknowledged Warnings',
		name: 'acknowledgedWarnings',
		type: 'string',
		default: '',
		description:
			'Comma-separated warning keys from the Check operation (warnings[].key), or an array from an expression',
		displayOptions: {
			show: { resource: ['dds'], operation: [operation], acknowledgeAll: [false] },
		},
	},
	{
		displayName: 'Acknowledge All Current Warnings',
		name: 'acknowledgeAll',
		type: 'boolean',
		default: false,
		description:
			'Whether to run the check first and acknowledge every warning it returns. Blocking issues are never bypassed.',
		displayOptions: { show: { resource: ['dds'], operation: [operation] } },
	},
];

export const ddsFields: INodeProperties[] = [
	// create
	{
		displayName: 'Batch ID',
		name: 'batchId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['dds'], operation: ['create'] } },
	},
	{
		displayName: 'Company Name or ID',
		name: 'operatorId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getOperators' },
		required: true,
		default: '',
		description:
			'The company that submits to TRACES. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { resource: ['dds'], operation: ['create'] } },
	},
	{
		displayName: 'Internal Reference Number',
		name: 'internalReferenceNumber',
		type: 'string',
		required: true,
		default: '',
		description: 'Unique per company; TRACES accepts 50 characters',
		displayOptions: { show: { resource: ['dds'], operation: ['create'] } },
	},
	{
		displayName: 'Activity Type',
		name: 'activityType',
		type: 'options',
		required: true,
		default: 'IMPORT',
		options: ACTIVITY_TYPE_OPTIONS,
		displayOptions: { show: { resource: ['dds'], operation: ['create'] } },
	},
	{
		displayName: 'Operator Role',
		name: 'operatorRole',
		type: 'options',
		required: true,
		default: 'OPERATOR',
		options: OPERATOR_ROLE_OPTIONS,
		displayOptions: { show: { resource: ['dds'], operation: ['create'] } },
	},
	{
		displayName: 'Country of Activity',
		name: 'countryOfActivity',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'ES',
		description: 'ISO 3166-1 alpha-2 country code',
		displayOptions: { show: { resource: ['dds'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['dds'], operation: ['create'] } },
		options: [
			{
				displayName: 'Associated Statements (JSON)',
				name: 'associatedStatements',
				type: 'json',
				default: '[]',
				description:
					'Array of { "referenceNumber": "...", "verificationNumber": "..." } of upstream statements',
			},
			{
				displayName: 'Border Cross Country',
				name: 'borderCrossCountry',
				type: 'string',
				default: '',
				description: 'ISO 3166-1 alpha-2 country code',
			},
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Geolocation Confidential',
				name: 'geoLocationConfidential',
				type: 'boolean',
				default: false,
				description: 'Whether the geolocation is hidden from downstream operators in TRACES',
			},
			{
				displayName: 'Represented Role',
				name: 'representedRole',
				type: 'options',
				default: 'OPERATOR',
				description: 'Required when the operator role is Authorised Representative',
				options: [
					{ name: 'Operator', value: 'OPERATOR' },
					{ name: 'Trader', value: 'TRADER' },
				],
			},
		],
	},

	idField(
		'dds',
		['amend', 'check', 'delete', 'get', 'refresh', 'retract', 'riskAssessment', 'submit', 'update'],
		'DDS ID',
		'ddsId',
		'ID of the due diligence statement in Sourevo',
	),

	// update
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['dds'], operation: ['update'] } },
		options: [
			{
				displayName: 'Activity Type',
				name: 'activityType',
				type: 'options',
				default: 'IMPORT',
				options: ACTIVITY_TYPE_OPTIONS,
			},
			{
				displayName: 'Border Cross Country',
				name: 'borderCrossCountry',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Country of Activity',
				name: 'countryOfActivity',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Geolocation Confidential',
				name: 'geoLocationConfidential',
				type: 'boolean',
				default: false,
				description: 'Whether the geolocation is hidden from downstream operators in TRACES',
			},
			{
				displayName: 'Internal Reference Number',
				name: 'internalReferenceNumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Operator Role',
				name: 'operatorRole',
				type: 'options',
				default: 'OPERATOR',
				options: OPERATOR_ROLE_OPTIONS,
			},
			{
				displayName: 'Represented Role',
				name: 'representedRole',
				type: 'options',
				default: 'OPERATOR',
				options: [
					{ name: 'Operator', value: 'OPERATOR' },
					{ name: 'Trader', value: 'TRADER' },
				],
			},
		],
	},

	// check
	{
		displayName: 'Include Payload',
		name: 'includePayload',
		type: 'boolean',
		default: false,
		description: 'Whether to also return the payload that would be sent to TRACES',
		displayOptions: { show: { resource: ['dds'], operation: ['check'] } },
	},

	// risk assessment
	{
		displayName: 'Adopt Sourevo Verdict',
		name: 'adoptVerdict',
		type: 'boolean',
		default: false,
		description:
			"Whether to seal Sourevo's proposed verdict and draft justification. Fails with verdict_not_ready while the proposal is NOT_YET.",
		displayOptions: { show: { resource: ['dds'], operation: ['riskAssessment'] } },
	},
	{
		displayName: 'Conclusion',
		name: 'conclusion',
		type: 'options',
		default: 'NEGLIGIBLE',
		options: [
			{ name: 'Negligible', value: 'NEGLIGIBLE' },
			{ name: 'Non-Negligible, Mitigated', value: 'NON_NEGLIGIBLE_MITIGATED' },
		],
		displayOptions: {
			show: { resource: ['dds'], operation: ['riskAssessment'], adoptVerdict: [false] },
		},
	},
	{
		displayName: 'Notes',
		name: 'notes',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		description: 'Justification of the conclusion, 30 to 5000 characters',
		displayOptions: {
			show: { resource: ['dds'], operation: ['riskAssessment'], adoptVerdict: [false] },
		},
	},
	{
		displayName: 'Options',
		name: 'riskOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['dds'], operation: ['riskAssessment'] } },
		options: [
			{
				displayName: 'Accept Gaps',
				name: 'acceptGaps',
				type: 'boolean',
				default: false,
				description:
					"Whether to conclude under the company's own responsibility while Sourevo still sees gaps (owner or admin keys only)",
			},
			{
				displayName: 'Locale',
				name: 'locale',
				type: 'options',
				default: 'en',
				description: 'Language of the draft justification when adopting the verdict',
				options: [
					{ name: 'Dutch', value: 'nl' },
					{ name: 'English', value: 'en' },
					{ name: 'French', value: 'fr' },
					{ name: 'German', value: 'de' },
					{ name: 'Italian', value: 'it' },
					{ name: 'Polish', value: 'pl' },
					{ name: 'Portuguese', value: 'pt' },
					{ name: 'Spanish', value: 'es' },
				],
			},
		],
	},

	// submit
	...acknowledgeFields('submit'),

	// amend
	{
		displayName: 'Changes',
		name: 'amendFields',
		type: 'collection',
		placeholder: 'Add Change',
		default: {},
		displayOptions: { show: { resource: ['dds'], operation: ['amend'] } },
		options: [
			{
				displayName: 'Activity Type',
				name: 'activityType',
				type: 'options',
				default: 'IMPORT',
				options: ACTIVITY_TYPE_OPTIONS,
			},
			{
				displayName: 'Add Plot IDs',
				name: 'addPlotIds',
				type: 'string',
				default: '',
				description: 'Comma-separated plot IDs to add with this amendment',
			},
			{
				displayName: 'Border Cross Country',
				name: 'borderCrossCountry',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Country of Activity',
				name: 'countryOfActivity',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Geolocation Confidential',
				name: 'geoLocationConfidential',
				type: 'boolean',
				default: false,
				description: 'Whether the geolocation is hidden from downstream operators in TRACES',
			},
			{
				displayName: 'Net Weight (Kg)',
				name: 'netWeightKg',
				type: 'number',
				typeOptions: { minValue: 0, numberPrecision: 3 },
				default: 0,
			},
			{
				displayName: 'Remove Plot IDs',
				name: 'removePlotIds',
				type: 'string',
				default: '',
				description: 'Comma-separated plot IDs to remove with this amendment',
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
	...acknowledgeFields('amend'),

	// retract
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		description: 'Why the statement is withdrawn (kept in the history)',
		displayOptions: { show: { resource: ['dds'], operation: ['retract'] } },
	},

	// list
	...returnAllAndLimit('dds', 'getAll'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['dds'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Batch ID',
				name: 'batchId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Company ID',
				name: 'operatorId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Internal Reference Number',
				name: 'internalReferenceNumber',
				type: 'string',
				default: '',
				description: 'Exact internal reference',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'multiOptions',
				default: [],
				options: DDS_STATUS_OPTIONS,
			},
			{
				displayName: 'Updated Since',
				name: 'updatedSince',
				type: 'dateTime',
				default: '',
				description: 'Only statements changed at or after this instant (polling)',
			},
		],
	},
];
