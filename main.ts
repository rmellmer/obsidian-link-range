import { App, MarkdownPostProcessorContext, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { around } from "monkey-around";

// Remember to rename these classes and interfaces!

interface LinkRangeSettings {
	headingSeparator: string;
}

const DEFAULT_SETTINGS: LinkRangeSettings = {
	headingSeparator: '..'
}

function checkLink(linkHTML: HTMLElement, settings: LinkRangeSettings, hrefField = "data-href"): any {
	const linkRegex = /([^#|]*)#?([^#|]*)?/;

	const href = linkHTML.getAttribute(hrefField);

	if (href == null) {
		return false;
	}

	const matches = linkRegex.exec(href)

	if (matches == null || matches?.length < 3 || matches[2] == undefined) {
		return false;
	}

	const header = matches[2];
	const split = header.split(settings.headingSeparator);

	// our ranged link format is "#h1..h2"
	if (split.length < 2) {
		return false;
	}

	const note = matches[1];
	const h1 = split[0];
	const h2 = split[1];

	if (app.metadataCache != null) {
		const foundNote : TFile | undefined = app.vault.getMarkdownFiles().filter(
			x => x.basename == note
		).first()

		if (foundNote) {
			const meta = app.metadataCache.getFileCache(foundNote);

			const h1Line = meta?.headings?.filter(
				h => h.heading == h1
			).first()?.position.start.line;

			const h2Line = meta?.headings?.filter(
				h => h.heading == h2
			).first()?.position.end;

			if (!h1Line) {
				return false;
			}

			return {
				note,
				h1,
				h2,
				h1Line,
				h2Line
			};
		}
	}
}

export default class LinkRange extends Plugin {
	settings: LinkRangeSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LinkRangeSettingTab(this.app, this));

		const settings = this.settings;

		// on page load, update hrefs to strip off second header to handle clickthrough, and add new range-href field
		this.registerMarkdownPostProcessor((el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
			const links = el.querySelectorAll('a.internal-link');

			links.forEach(link => { 
				const htmlLink = link as HTMLElement
				const res = checkLink(htmlLink, settings);

				if (res !== false) {
					htmlLink.setAttribute("href", res.note + "#" + res.h1);
					htmlLink.setAttribute("data-href", res.note + "#" + res.h1);
					htmlLink.setAttribute("range-href", res.note + "#" + res.h1 + this.settings.headingSeparator + res.h2);
				}
			});
		});

		// wait for layout to be ready
		this.app.workspace.onLayoutReady(() => {
			const pagePreviewPlugin = this.app.internalPlugins.plugins["page-preview"];

			console.log("LinkRange: Hooking into page-preview onHover calls")
			// intercept page-preview plugin
			const uninstaller = around(pagePreviewPlugin.instance.constructor.prototype, {
				onHoverLink(old: Function) {
					return function (options: { event: MouseEvent }, ...args: unknown[]) {
						return old.call(this, options, ...args);
					};
				},
				onLinkHover(old: Function) {
					return function (
						parent: any,
						targetEl: HTMLElement,
						linkText: string,
						path: string,
						state: any,
						...args: unknown[]
					) {
						// parse link using the added range-href field
						const res = checkLink(targetEl, settings, "range-href")
						if (res !== false) {
							old.call(this, parent, targetEl, res.note, path, {scroll:res.h1Line}, ...args)
						} else {
							old.call(this, parent, targetEl, linkText, path, state, ...args);
						}
					};
				},
			});
			this.register(uninstaller);
		
			// This will recycle the event handlers so that they pick up the patched onLinkHover method
			pagePreviewPlugin.disable();
			pagePreviewPlugin.enable();
		
			this.register(function () {
				if (!pagePreviewPlugin.enabled) return;
				pagePreviewPlugin.disable();
				pagePreviewPlugin.enable();
			});
		});
	}

	onunload() {
		
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class LinkRangeSettingTab extends PluginSettingTab {
	plugin: LinkRange;

	constructor(app: App, plugin: LinkRange) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Heading Separator')
			.setDesc('Defines the separator to be used to define a link heading range. Defaults to ".." (i.e. [[Note Name#h1..h2]])')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.headingSeparator)
				.onChange(async (value) => {
					this.plugin.settings.headingSeparator = value;
					await this.plugin.saveSettings();
				}));
	}
}
