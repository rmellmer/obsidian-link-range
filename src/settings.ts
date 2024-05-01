import LinkRange from "main";
import { App, PluginSettingTab, Setting, ButtonComponent } from "obsidian";
import { postProcessorUpdate } from "./utils";

export interface Pattern {
	headingVisual: string;
	headingSeparatorVisual: string;
	path: string;
}

export interface LinkRangeSettings {
	headingSeparator: string;
	endInclusive: boolean;
	altFormat: string; // This is for backwards compatibility
	settingsVersion: string;
	patterns: [Pattern]
	getDefaultPattern() : Pattern
}

export const DEFAULT_SETTINGS: LinkRangeSettings = {
	headingSeparator: '..',
	endInclusive: true,
	altFormat: '',
	settingsVersion: 'v2',
	patterns: [{ headingVisual: '..', headingSeparatorVisual: '-', path: '/' }],

	getDefaultPattern() {
		const first = this.patterns[0];
		if (!first) {
			return { headingVisual: ':', headingSeparatorVisual: '-', path: '/' }
		}

		return first;
	},
}

export class LinkRangeSettingTab extends PluginSettingTab {
	plugin: LinkRange;

	constructor(app: App, plugin: LinkRange) {
		super(app, plugin);
		this.plugin = plugin;
		this.migrateOldSettings();
	}

	migrateOldSettings() {
		const stgs = this.plugin.settings;

		const hasV1Settings = stgs.altFormat != undefined && stgs.altFormat.length > 0;
		if (hasV1Settings) {	

			// default altFormat string: `$note:$h1-$h2`
			const altFormat = stgs.altFormat;
			const indexOfNote = altFormat.indexOf('$note');
			const indexOfH1 = altFormat.indexOf('$h1');
			const indexOfH2 = altFormat.indexOf('$h2');

			const formatIsValid = indexOfNote === 0 && indexOfH1 !== -1 && indexOfH2 !== -2;
			
			if (formatIsValid) {
				const firstValue = altFormat.substring('$note'.length, indexOfH1);
				const secondValue = altFormat.substring(indexOfH1 + '$h1'.length, indexOfH2);

				stgs.patterns = [{ headingVisual: firstValue, headingSeparatorVisual: secondValue, path: '' }]
			}

			stgs.altFormat = '';
			this.plugin.saveSettings();
		}
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		this.createH2('Settings for link-range plugin')

		new Setting(containerEl)
			.setName('Heading Separator')
			.setDesc('Defines the separator to be used to define a link heading range. Defaults to ".." (e.g. [[Note Name#h1..h2]])')
			.addText(text => text
				.setPlaceholder('Enter a separator string (defaults to ..)')
				.setValue(this.plugin.settings.headingSeparator)
				.onChange(async (value) => {
					this.plugin.settings.headingSeparator = value;
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
	
		new Setting(this.containerEl)
			.setName("Add a New Visual Pattern")
			.setDesc("Add new pattern to match files in a directory. The first value will change the visual for the heading in a link. The second value will change the visual for separator. The third specifies the folder in which the files must be to match. The first match, starting bottom up, will be applied. Therefore, the first is the default pattern.")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip("Add new pattern to match files in a directory.")
					.setButtonText("+")
					.setCta()
					.onClick(() => {
						this.plugin.settings.patterns.push({
							headingVisual: '',
							headingSeparatorVisual: '',
							path: ''
						});
						this.plugin.saveSettings();
						this.display();
					});
			});
		
			this.plugin.settings.patterns.forEach(
				(pattern, index) => {
					const s = new Setting(this.containerEl)
					.addText(text => text
						.setPlaceholder('Enter a heading override')
						.setValue(pattern.headingVisual)
						.onChange(async (value) => {
							pattern.headingVisual = value;
							await this.plugin.saveSettings();
							postProcessorUpdate(this.app)
						}))
					.addText(text => text
						.setPlaceholder('Enter a separator override')
						.setValue(pattern.headingSeparatorVisual)
						.onChange(async (value) => {
							pattern.headingSeparatorVisual = value;
							await this.plugin.saveSettings();
							postProcessorUpdate(this.app)
						}))
					.addText(text => text
						.setPlaceholder(index === 0 ? '(global)' : 'Enter a path')
						.setValue(pattern.path)
						.setDisabled(index === 0)
						.onChange(async (value) => {
							pattern.path = value;
							await this.plugin.saveSettings();
							postProcessorUpdate(this.app)
						}));

					if (index === 0) {
						s.addExtraButton((cb) => {
							cb.setIcon("lock")
								.setTooltip("This pattern is the default and cannot be completed");					
						});
					}
					else {
						if (index !== 0) {
							s.addExtraButton((cb) => {
								cb.setIcon("cross")
									.setTooltip("Delete")
									.onClick(() => {
										this.plugin.settings.patterns.splice(
											index,
											1
										);
										this.plugin.saveSettings();
										this.display();
									});
						
							});
						}
					}
				}
			);
	}

	createH2(text: string) {
		const {containerEl} = this;
		containerEl.createEl('h2', { text: text });
	}

	
}
