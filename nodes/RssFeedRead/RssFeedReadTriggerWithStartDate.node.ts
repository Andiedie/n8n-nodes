import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import Parser from 'rss-parser';
import moment from 'moment';

// noinspection JSUnusedGlobalSymbols
export class RssFeedReadTriggerWithStartDate implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RSS Feed Trigger With Start Date',
		name: 'rssFeedReadTriggerWithStartDate',
		icon: 'fa:rss',
		group: ['trigger'],
		version: 1,
		description: 'Starts a workflow when an RSS feed is updated',
		subtitle: '={{$parameter["event"]}}',
		defaults: {
			name: 'RSS Feed Trigger',
			color: '#b02020',
		},
		polling: true,
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Feed URL',
				name: 'feedUrl',
				type: 'string',
				default: 'https://blog.n8n.io/rss/',
				required: true,
				description: 'URL of the RSS feed to poll',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '1970-01-01T00:00:00Z',
				required: true,
				description: 'Start date of item',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const pollData = this.getWorkflowStaticData('node');
		const feedUrl = this.getNodeParameter('feedUrl') as string;

		const startDate = (pollData.lastTimeChecked as string) || this.getNodeParameter('startDate') as string;
		const endDate = moment().utc().format();

		if (!feedUrl) {
			throw new NodeOperationError(this.getNode(), 'The parameter "URL" has to be set!');
		}

		const parser = new Parser();

		let feed: Parser.Output<IDataObject>;
		try {
			feed = await parser.parseURL(feedUrl);
		} catch (error) {
			if (error.code === 'ECONNREFUSED') {
				throw new NodeOperationError(
					this.getNode(),
					`It was not possible to connect to the URL. Please make sure the URL "${feedUrl}" it is valid!`,
				);
			}

			throw new NodeOperationError(this.getNode(), error as Error);
		}

		const returnData: IDataObject[] = [];

		if (feed.items) {
			feed.items.forEach((item) => {
				if (Date.parse(item.isoDate as string) >= Date.parse(startDate)) {
					returnData.push(item);
				}
			});
		}
		pollData.lastTimeChecked = endDate;

		if (Array.isArray(returnData) && returnData.length !== 0) {
			return [this.helpers.returnJsonArray(returnData)];
		}

		return null;
	}
}
