import { EditorView, Decoration, DecorationSet, PluginValue, ViewUpdate } from "@codemirror/view";
import { editorLivePreviewField } from "obsidian";
import { LinkRangeSettings } from "./settings";
import { RangeSetBuilder } from "@codemirror/state";
import { replaceEmbed } from "./embeds";

export class LinkRangeView implements PluginValue {
	decorations: DecorationSet = Decoration.none;
	settings: LinkRangeSettings;

	constructor(settings: LinkRangeSettings) {
		this.settings = settings;
	}

	buildDecorations(view: EditorView): DecorationSet {
		const buffer = new RangeSetBuilder<Decoration>()
		const embeds = view.contentDOM.querySelectorAll("div.internal-embed");

		embeds.forEach(embed => {
			replaceEmbed(embed, this.settings)
		})

		return buffer.finish();
	}

	update(update: ViewUpdate) {
		if (!update.state.field(editorLivePreviewField)) {
			// live preview only, not rendered in strict source code view
			this.decorations = Decoration.none;
			return;
		}

		if (update.docChanged || update.viewportChanged || this.decorations === Decoration.none) {
			this.decorations = this.buildDecorations(update.view);
		}
	}	
}
