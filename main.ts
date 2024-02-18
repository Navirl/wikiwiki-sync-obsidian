import {
	App,
	Notice,
	requestUrl,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder
} from "obsidian";
import * as yamlFrontMatter from "yaml-front-matter";
import * as yaml from "yaml";

interface SyncWikiWikiSettings {
	wikiName: string;
	apiKey: string;
	apiSecret: string;
	apiToken: string;
}

const DEFAULT_SETTINGS: SyncWikiWikiSettings = {
	wikiName: "",
	apiKey: "",
	apiSecret: "",
	apiToken: "",
};

export default class SyncWikiWiki extends Plugin {
	settings: SyncWikiWikiSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const putIconEl = this.addRibbonIcon(
			"switch",
			"Put page",
			async (evt: MouseEvent) => {
				await this.putPage();
			}
		);

		this.addCommand({
			id: 'get-all-pages',
			name: 'Get all pages',
			callback: async () => {
				await this.getAllPages();
			}
		});

		this.addCommand({
			id: 'put-page',
			name: 'Put page',
			callback: async () => {
				await this.putPage();
			}
		});
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SyncWikiWikiSettingTab(this.app, this));

	}

	onunload() { }

	async getAllPages() {
		let response: any
				try {
					const res = await requestUrl({
						url: `https://api.wikiwiki.jp/${this.settings.wikiName}/pages`,
						method: 'GET',
						headers: {
							'Authorization': 'Bearer ' + this.settings.apiToken,
						}
					})
					response = res
				} catch (e) {
					const tokenres = await requestUrl({
						url: `https://api.wikiwiki.jp/${this.settings.wikiName}/auth`,
						method: 'POST',
						headers: {
							'content-type': 'application/json'
						},
						body: JSON.stringify(
							{
								"api_key_id": this.settings.apiKey,
								"secret": this.settings.apiSecret
							}
						)
					})
					if (!(tokenres.json.status === "ok")) {
						new Notice("認証に失敗しました");
						return
					}
					this.settings.apiToken = tokenres.json.token
					await this.saveSettings();
					const res = await requestUrl({
						url: `https://api.wikiwiki.jp/${this.settings.wikiName}/pages`,
						method: 'GET',
						headers: {
							'Authorization': 'Bearer ' + this.settings.apiToken,
						}
					})
					response = res
				}
				for (let res of response.json.pages) {
					const filedate = new Date(res.timestamp)
					const name: string = res.name
					if (name.contains(":")) {
						continue;
					} else {
						const uri = res.uri
						//fileがあればここで拾う
						let file = this.app.vault.getAbstractFileByPath(`${name}.md`)
						//fileがなければここで作る
						if (!(file instanceof TFile)) {
							if (name.contains("/")) {
								const names = name.split("/")
								let foldername: string = names[0];
								names.forEach((v, i) => {
									if (i !== 0 && i !== names.length - 1) {
										foldername = foldername + "/" + v;
									}
								});
								if (!(this.app.vault.getAbstractFileByPath(foldername) instanceof TFolder)) {
									await this.app.vault.createFolder(foldername)
								};
							}
							file = await this.app.vault.create(`/${name}.md`, "")
						}
						if (!(file instanceof TFile)) {
							continue
						}
						let yamlObj: any = yamlFrontMatter.loadFront(await this.app.vault.read(file))
						if(yamlObj.__content == ""){
							yamlObj = yamlFrontMatter.loadFront("---\ndate: 1970-01-01T00:00:00.000Z\n---\n")
						}
						if (filedate.getTime() === yamlObj.date.getTime()) {
							continue;
						}
						new Notice(`name: ${name} syncing...`)
						// const __content = yamlObj.__content
						delete yamlObj.__content
						yamlObj.date = filedate
						const yamlhead = yaml.stringify(yamlObj)
						const yamlhead_remove_n = yamlhead.replace(/\n$/, '')

						// const __content_remove_n = __content.replace(/^\n/, '')
						const fileresponse = await requestUrl({
							url: `https://api.wikiwiki.jp${uri}`,
							method: 'GET',
							headers: {
								'Authorization': 'Bearer ' + this.settings.apiToken,
							}
						})
						const content = '---\n' + yamlhead_remove_n + '\n---\n' + fileresponse.json.source.replace(/^\n/, '');
						await this.app.vault.modify(file, content);
					}
					await sleep(1000);
					new Notice(`name: ${name} sync complete!`)
				}
				new Notice('Get all pages complete!')
	}

	async putPage() {
		const file = this.app.workspace.getActiveFile();
		if (!(file instanceof TFile)) {
			new Notice("Please select a file")
			return
		}
		let name: string = file?.basename ? file?.basename : "";
		let parentObj = file?.parent;
		while (parentObj) {
			name = parentObj.name + "/" + name
			parentObj = parentObj.parent
		}
		const fileread = await this.app.vault.read(file)
		const yamlObj: any = yamlFrontMatter.loadFront(fileread)
		const __content = yamlObj.__content
		delete yamlObj.__content
		const content = __content.replace(/^\n/, '')
		try {
			const response = await requestUrl({
				url: `https://api.wikiwiki.jp/${this.settings.wikiName}/page/${name}`,
				method: 'PUT',
				headers: {
					'Authorization': 'Bearer ' + this.settings.apiToken,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					source: content
				})
			});
		} catch (error) {
			console.log(error);
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SyncWikiWikiSettingTab extends PluginSettingTab {
	plugin: SyncWikiWiki;

	constructor(app: App, plugin: SyncWikiWiki) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("wiki name")
			.setDesc("part of unique URL")
			.addText((text) =>
				text
					.setPlaceholder("Enter wiki name")
					.setValue(this.plugin.settings.wikiName)
					.onChange(async (value) => {
						this.plugin.settings.wikiName = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("api key")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your key")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("api secret")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.apiSecret)
					.onChange(async (value) => {
						this.plugin.settings.apiSecret = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("api token")
			.setDesc("If already set key and token, you don't need to set this.")
			.addText((text) =>
				text
					.setPlaceholder("")
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
