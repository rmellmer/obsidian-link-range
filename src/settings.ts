import LinkRange from "main";
import { App, PluginSettingTab, Setting } from "obsidian";
import { postProcessorUpdate } from "./utils";

export interface LinkRangeSettings {
	headingSeparator: string;
	altFormat: string;
	endInclusive: boolean;
	headingVisual: string,
	headingSeparatorVisual: string,
}

export const DEFAULT_SETTINGS: LinkRangeSettings = {
	headingSeparator: '..',
	altFormat: '$note:$h1-$h2',
	endInclusive: true,
	headingVisual: ':',
	headingSeparatorVisual: '-',
}

export class LinkRangeSettingTab extends PluginSettingTab {
	plugin: LinkRange;

	constructor(app: App, plugin: LinkRange) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for link-range plugin'});

		new Setting(containerEl)
			.setName('Heading Separator')
			.setDesc('Defines the separator to be used to define a link heading range. Defaults to ".." (i.e. [[Note Name#h1..h2]])')
			.addText(text => text
				.setPlaceholder('Enter a separator string (defaults to ..)')
				.setValue(this.plugin.settings.headingSeparator)
				.onChange(async (value) => {
					this.plugin.settings.headingSeparator = value;
					await this.plugin.saveSettings();
					postProcessorUpdate(this.app)
				}));

		new Setting(containerEl)
			.setName('Alt Text Format')
			.setDesc('Defines the alternate text format that gets shown in read mode. Use $note for the note placeholder and $h1/$h2 for the header placeholders')
			.addText(text => text
				.setPlaceholder('Enter an alt format')
				.setValue(this.plugin.settings.altFormat)
				.onChange(async (value) => {
					this.plugin.settings.altFormat = value;
					await this.plugin.saveSettings();
					postProcessorUpdate(this.app)
				}));

		new Setting(containerEl)
			.setName('Heading visual override for live preview')
			.setDesc('Defines the override for the heading (#) character for live preview mode.')
			.addText(text => text
				.setPlaceholder('Enter an override')
				.setValue(this.plugin.settings.headingVisual)
				.onChange(async (value) => {
					this.plugin.settings.headingVisual = value;
					await this.plugin.saveSettings();
					postProcessorUpdate(this.app)
				}));

		new Setting(containerEl)
			.setName('Heading separator visual override for live preview')
			.setDesc('Defines the override for the heading (>, or whatever is defined) character for live preview mode.')
			.addText(text => text
				.setPlaceholder('Enter an override')
				.setValue(this.plugin.settings.headingSeparatorVisual)
				.onChange(async (value) => {
					this.plugin.settings.headingSeparatorVisual = value;
					await this.plugin.saveSettings();
					postProcessorUpdate(this.app)
				}));
	
		new Setting(containerEl)
			.setName('End Inclusive')
			.setDesc('Whether or not the end heading should be inclusive or exclusive')
			.addToggle(bool => bool
				.setValue(this.plugin.settings.endInclusive)
				.onChange(async (value) => {
					this.plugin.settings.endInclusive = value;
					await this.plugin.saveSettings();
					postProcessorUpdate(this.app)
				}));
	}
}
