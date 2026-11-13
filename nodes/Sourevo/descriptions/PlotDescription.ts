import type { INodeProperties } from 'n8n-workflow';

import { idField, returnAllAndLimit } from './common';

export const plotOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['plot'] } },
		options: [
			{
				name: 'Add to Supplier',
				value: 'create',
				description:
					'Upload plots as your proposal to the supplier (point, GeoJSON or a KML/KMZ/CSV/XLSX/GeoJSON file)',
				action: 'Add plots to a supplier',
			},
			{ name: 'Get', value: 'get', description: 'Get a plot', action: 'Get a plot' },
			{
				name: 'Get Latest Satellite Check',
				value: 'getLatestSatelliteCheck',
				description: 'Latest satellite deforestation check by your organization',
				action: 'Get the latest satellite check of a plot',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Plots of a supplier your organization can use',
				action: 'Get many plots of a supplier',
			},
			{
				name: 'Request Correction',
				value: 'requestCorrection',
				description: 'Ask the supplier to correct the plot',
				action: 'Request a plot correction',
			},
			{
				name: 'Run Satellite Check',
				value: 'runSatelliteCheck',
				description: 'Run a satellite deforestation check now',
				action: 'Run a satellite check on a plot',
			},
			{
				name: 'Verify',
				value: 'verify',
				description: 'Verify (approve) the plot for your organization',
				action: 'Verify a plot',
			},
		],
		default: 'create',
	},
];

export const plotFields: INodeProperties[] = [
	idField(
		'plot',
		['create', 'getAll'],
		'Supplier ID',
		'supplierId',
		'ID of the supplier the plots belong to',
	),
	{
		displayName: 'Geometry Source',
		name: 'geometrySource',
		type: 'options',
		default: 'point',
		displayOptions: { show: { resource: ['plot'], operation: ['create'] } },
		options: [
			{
				name: 'Binary File',
				value: 'file',
				description: 'A KML, KMZ, CSV, TSV, XLSX or GeoJSON file from a binary property',
			},
			{
				name: 'GeoJSON',
				value: 'geojson',
				description: 'A Geometry, Feature or FeatureCollection in WGS84',
			},
			{
				name: 'Point',
				value: 'point',
				description: 'Latitude, longitude and area',
			},
		],
	},
	{
		displayName: 'Latitude',
		name: 'latitude',
		type: 'number',
		typeOptions: { minValue: -90, maxValue: 90, numberPrecision: 7 },
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['plot'], operation: ['create'], geometrySource: ['point'] },
		},
	},
	{
		displayName: 'Longitude',
		name: 'longitude',
		type: 'number',
		typeOptions: { minValue: -180, maxValue: 180, numberPrecision: 7 },
		required: true,
		default: 0,
		displayOptions: {
			show: { resource: ['plot'], operation: ['create'], geometrySource: ['point'] },
		},
	},
	{
		displayName: 'Area (Ha)',
		name: 'areaHa',
		type: 'number',
		typeOptions: { minValue: 0, numberPrecision: 4 },
		required: true,
		default: 1,
		description:
			'Area of the plot in hectares. A plot over 4 ha must be a polygon, unless it is a livestock establishment.',
		displayOptions: {
			show: { resource: ['plot'], operation: ['create'], geometrySource: ['point'] },
		},
	},
	{
		displayName: 'GeoJSON',
		name: 'geojson',
		type: 'json',
		required: true,
		default: '',
		description:
			'Feature properties name/ProductionPlace, ProducerName, ProducerCountry, Area and LivestockEstablishment are read',
		displayOptions: {
			show: { resource: ['plot'], operation: ['create'], geometrySource: ['geojson'] },
		},
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the input binary field containing the plots file',
		displayOptions: {
			show: { resource: ['plot'], operation: ['create'], geometrySource: ['file'] },
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['plot'], operation: ['create'] } },
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'ISO 3166-1 alpha-2 country code of the plot',
			},
			{
				displayName: 'File Format',
				name: 'format',
				type: 'options',
				default: 'geojson',
				description: 'Format of the binary file. By default it is taken from the file extension.',
				options: [
					{ name: 'CSV', value: 'csv' },
					{ name: 'GeoJSON', value: 'geojson' },
					{ name: 'JSON', value: 'json' },
					{ name: 'KML', value: 'kml' },
					{ name: 'KMZ', value: 'kmz' },
					{ name: 'TSV', value: 'tsv' },
					{ name: 'TXT', value: 'txt' },
					{ name: 'XLSX', value: 'xlsx' },
				],
			},
			{
				displayName: 'Livestock Establishment',
				name: 'livestockEstablishment',
				type: 'boolean',
				default: false,
				description:
					'Whether every point is a cattle establishment (EUDR art. 2.28), so the 4 ha polygon rule does not apply.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description:
					'Name of the plot. Required for a point, and for GeoJSON features without their own name or ProductionPlace.',
			},
			{
				displayName: 'Producer Name',
				name: 'producerName',
				type: 'string',
				default: '',
				description:
					'Who produced the commodity on the plot when it is not the supplier (default for features without their own ProducerName)',
			},
		],
	},
	idField(
		'plot',
		['get', 'verify', 'requestCorrection', 'runSatelliteCheck', 'getLatestSatelliteCheck'],
		'Plot ID',
		'plotId',
		'ID of the plot',
	),
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		description: 'What the supplier has to correct (the supplier reads it as written)',
		displayOptions: { show: { resource: ['plot'], operation: ['requestCorrection'] } },
	},
	...returnAllAndLimit('plot', 'getAll'),
];
