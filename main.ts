import { Plugin } from 'obsidian';
import { around } from "monkey-around";
import { ViewPlugin } from "@codemirror/view";
import { DEFAULT_SETTINGS, LinkRangeSettings, LinkRangeSettingTab } from 'src/settings';
import { linkRangePostProcessor } from 'src/markdownPostProcessor';
import { checkLink } from 'src/utils';
import { LinkRangeView } from 'src/linkRangeView';

export default class LinkRange extends Plugin {
	settings: LinkRangeSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LinkRangeSettingTab(this.app, this));

		const settings = this.settings;

		// on page load, update hrefs to strip off second header to handle clickthrough, and add new range-href field
		this.registerMarkdownPostProcessor((el, ctx) => {
			linkRangePostProcessor(el, ctx, settings)
		});

		// wait for layout to be ready
		this.app.workspace.onLayoutReady(() => {
			this.registerEditorExtension(ViewPlugin.define((v) => {
				return new LinkRangeView(this.settings)
			}));

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
						const res = checkLink(targetEl, settings, false, "range-href")
						if (res !== null) {
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
