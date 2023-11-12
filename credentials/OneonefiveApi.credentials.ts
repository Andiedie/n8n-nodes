import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OneonefiveApi implements ICredentialType {
	name = 'oneonefiveApi';
	displayName = '115 API';
	// documentationUrl = '<your-docs-url>';
	properties: INodeProperties[] = [
		{
			displayName: 'CID',
			name: 'cid',
			type: 'string',
			default: '',
		},
		{
			displayName: 'SEID',
			name: 'seid',
			type: 'string',
			default: '',
		},
		{
			displayName: 'UID',
			name: 'uid',
			type: 'string',
			default: '',
		},
	];

	// This allows the credential to be used by other parts of n8n
	// stating how this credential is injected as part of the request
	// An example is the Http Request node that can make generic calls
	// reusing this credential
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Cookie: '=CID={{$credentials.cid}}; SEID={{$credentials.seid}}; UID={{$credentials.uid}}',
			},
		},
	};

	// The block below tells how this credential can be tested
	test: ICredentialTestRequest = {
		request: {
			url: 'https://home.115.com/api/1.0/web/1.0/user/unread',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'code',
					value: 99,
					message: 'invalid credentials',
				},
			},
		],
	};
}
