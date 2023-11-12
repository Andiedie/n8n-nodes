import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { imageFields, imageOperations } from './ImageDescription';
import { chatFields, chatOperations } from './ChatDescription';

export class CustomOpenAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CustomOpenAi',
		name: 'customOpenAi',
		icon: 'file:openAi.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Custom Open AI',
		defaults: {
			name: 'CustomOpenAI',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'customOpenAiApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{$credentials.baseUrl}}',
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Chat',
						value: 'chat',
					},
					{
						name: 'Image',
						value: 'image',
					},
				],
				default: 'chat',
			},

			...chatOperations,
			...chatFields,

			...imageOperations,
			...imageFields,
		],
	};
}
