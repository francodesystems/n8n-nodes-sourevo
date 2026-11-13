import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SourevoApi implements ICredentialType {
	name = 'sourevoApi';

	displayName = 'Sourevo API';

	icon = { light: 'file:sourevo.svg', dark: 'file:sourevo.dark.svg' } as const;

	// eslint-disable-next-line n8n-nodes-base/cred-class-field-documentation-url-miscased
	documentationUrl = 'https://sourevo.com/en/developers';

	properties: INodeProperties[] = [
		{
			displayName:
				'The Sourevo API is included in the Pro, Enterprise and Forwarder plans. Trial accounts can use it in simulated mode (SIM reference numbers, nothing reaches TRACES). Packs do not include the API.',
			name: 'planNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'svk_...',
			description:
				'An API key starting with svk_. Create it in Sourevo → API and integrations (owners and admins). The key acts as the user who created it',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://sourevo.com',
			description: 'Only change it to point the node at another Sourevo installation',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
				'X-Sourevo-Client': 'n8n',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}/api/v1',
			url: '/me',
			method: 'GET',
		},
	};
}
