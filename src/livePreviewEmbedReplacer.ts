import { EditorView, Decoration, DecorationSet, PluginValue, ViewUpdate } from "@codemirror/view";
import { App, editorLivePreviewField } from "obsidian";
import { LinkRangeSettings } from "./settings";
import { RangeSetBuilder } from "@codemirror/state";
import { replaceEmbed } from "./embeds";

export class LifePreviewEmbedReplacer implements PluginValue {
	decorations: DecorationSet = Decoration.none;
	settings: LinkRangeSettings;
	app: App;

	constructor(settings: LinkRangeSettings, app: App) {
		this.settings = settings;
		this.app = app;
	}

	buildDecorations(view: EditorView): DecorationSet {
		const buffer = new RangeSetBuilder<Decoration>()
		const embeds = view.contentDOM.querySelectorAll("div.markdown-embed");

		embeds.forEach(embed => {
			replaceEmbed(this.app, embed, this.settings)
		})

		return buffer.finish();
	}

	update(update: ViewUpdate) {
		if (!update.state.field(editorLivePreviewField)) {
			// live preview only, not rendered in strict source code view
			this.decorations = Decoration.none;
			return;
		}

		if ( update.docChanged || update.viewportChanged || update.focusChanged ) {
			this.decorations = this.buildDecorations(update.view);
		}
	}	
}
