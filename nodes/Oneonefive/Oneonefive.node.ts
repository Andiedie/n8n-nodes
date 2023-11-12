import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { OptionsWithUrl } from 'request';

type File = {
	// 文件则有这个属性，表示文件 ID
	fid: string | undefined;
	// 如果是文件夹，则表示文件夹的 ID，如果是文件，则表示是父 ID
	cid: string;
	// 文件夹则有这个属性，表示父 ID
	pid: string | undefined;
	// 文件名
	n: string;
};

// noinspection JSUnusedGlobalSymbols
export class Oneonefive implements INodeType {
	description: INodeTypeDescription = {
		displayName: '115',
		name: 'oneonefive',
		icon: 'file:115.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Interact with 115',
		defaults: {
			name: '115',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'oneonefiveApi',
				required: true,
			},
		],
		/**
		 * In the properties array we have two mandatory options objects required
		 *
		 * [Resource & Operation]
		 *
		 * https://docs.n8n.io/integrations/creating-nodes/code/create-first-node/#resources-and-operations
		 *
		 * In our example, the operations are separated into their own file (HTTPVerbDescription.ts)
		 * to keep this class easy to read.
		 *
		 */
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,

				options: [
					{
						name: 'Add Link Tasks',
						value: 'addLinkTasks',
						action: 'Add link tasks',
					},
				],
				default: 'addLinkTasks',
			},
			{
				displayName: 'Links to Download',
				name: 'links2Download',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['addLinkTasks'],
					},
				},
			},
			{
				displayName: 'Path to Save',
				name: 'path2Save',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['addLinkTasks'],
					},
				},
			},
		],
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const api = async (options: OptionsWithUrl): Promise<any> => {
			const body: {
				state: boolean;
			} = await this.helpers.requestWithAuthentication.call(this, 'oneonefiveApi', options);
			// console.log(options, body);
			if (!body.state) {
				throw new NodeOperationError(this.getNode(), `115 API error: ${JSON.stringify(body)}`);
			}
			return body;
		};

		const listFiles = async (cid: string): Promise<Array<File>> => {
			const result: Array<File> = [];
			let offset = 0;
			while (true) {
				const options: OptionsWithUrl = {
					url: 'https://aps.115.com/natsort/files.php',
					method: 'GET',
					qs: {
						cid,
						show_dir: 1,
						offset,
						limit: 1150,
					},
					json: true,
				};
				const body: { data: Array<File>; count: number } = await api(options);
				result.push(...body.data);
				if (result.length >= body.count) {
					break;
				}
			}
			return result;
		};

		const mkdir = async (cid: string, name: string): Promise<string> => {
			const files = await listFiles(cid);
			for (const file of files) {
				if (file.n === name) {
					// console.log(`Found ${name} ${file.cid}`);
					return file.cid;
				}
			}
			const options: OptionsWithUrl = {
				url: 'https://webapi.115.com/files/add',
				method: 'POST',
				form: {
					pid: cid,
					cname: name,
				},
				json: true,
			};

			const body: { cid: string } = await api(options);
			// console.log(`Created ${name} ${body.cid}`);
			return body.cid;
		};

		const ensureDir = async (path: string): Promise<string> => {
			const dirs = path.split('/').filter((dir) => dir !== '');
			let currentCid = '0';
			for (const dir of dirs) {
				currentCid = await mkdir(currentCid, dir);
				// console.log(`${dir} ${currentCid}`);
			}
			return currentCid;
		};

		const addLinkTasks = async (links: Array<string>, cid: string): Promise<Array<string>> => {
			const form: { [key: string]: string } = {
				wp_path_id: cid,
			};
			for (const [idx, link] of links.entries()) {
				form[`url[${idx}]`] = link;
			}
			const options: OptionsWithUrl = {
				url: 'https://115.com/web/lixian/',
				qs: {
					ct: 'lixian',
					ac: 'add_task_urls',
				},
				method: 'POST',
				form,
				json: true,
			};
			const body: { result: Array<{ state: boolean; info_hash: string }> } = await api(options);
			if (body.result.some((result) => !result.state)) {
				throw new NodeOperationError(this.getNode(), `115 API error: ${JSON.stringify(body)}`);
			}
			return body.result.map((result) => result.info_hash);
		};

		const operation = this.getNodeParameter('operation', 0) as string;
		if (operation !== 'addLinkTasks') {
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
		}

		const items = this.getInputData();
		const jobs: { [key: string]: Array<string> } = {};
		for (let i = 0; i < items.length; i++) {
			const path = this.getNodeParameter('path2Save', i) as string;
			if (!jobs[path]) {
				jobs[path] = [];
			}
			jobs[path].push(this.getNodeParameter('links2Download', i) as string);
		}

		const info_hash: Array<string> = [];
		for (const [path, links] of Object.entries(jobs)) {
			const cid = await ensureDir(path);
			info_hash.push(...(await addLinkTasks(links, cid)));
		}

		const data = info_hash.map((info_hash) => ({ info_hash }));

		return [this.helpers.returnJsonArray(data)];
	}
}
