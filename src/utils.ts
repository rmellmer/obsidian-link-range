import { App, TFile } from "obsidian";
import { LinkRangeSettings, Pattern } from "./settings";

export interface ParsedLink {
	note: string;
	h1: string;
	h2?: string;
	altText?: string;
	h1Line?: number;
	h2Line?: number;
}

const NOTE_PLACEHOLDER = "$note"
const H1_PLACEHOLDER = "$h1"
const H2_PLACEHOLDER = "$h2"

export function checkLinkText(href: string, settings: LinkRangeSettings): ParsedLink | null {
	const linkRegex = /([^#|]*)#?([^#|]*)?\|?(.*)?/;

	const matches = linkRegex.exec(href);

	if (matches == null || matches?.length < 3 || matches[2] == undefined) {
		return null;
	}

	const header = matches[2];
	const split = header.split(settings.headingSeparator);

	// our ranged link format is "#h1..h2"
	if (split.length < 2) {
		return null;
	}

	const note = matches[1];
	const h1 = split[0];
	const h2 = split[1];

	let altText = undefined;

	if (matches?.length > 3 && matches[3] != undefined) {
		altText = matches[3]
	}
	else {

		const file = app.vault.getFiles().find((file) => file.basename === note);

		let pattern = [...settings.patterns].reverse().find((pattern: Pattern) => file?.path.startsWith(pattern.path))
		if (!pattern) {
			pattern = settings.getDefaultPattern();
		}

		altText = `${note}${pattern.headingVisual}${h1}${pattern.headingSeparatorVisual}${h2}`
	}

	return { note, h1, h2, altText }
}

export function checkLink(app :App, linkHTML: HTMLElement, settings: LinkRangeSettings, isEmbed=false, hrefField = "data-href"): ParsedLink | null {
	const href = linkHTML.getAttribute(hrefField);

	if (href == null) {
		return null;
	}

	const res = checkLinkText(href, settings)

	const alt = linkHTML.getAttribute("alt")

	if (res && app.metadataCache != null) {
		// non-standard alt text, must be user provided via "|"
		if (alt != null && !alt.contains(res.note)) {
			res.altText = alt
		}

		if (!isEmbed && !linkHTML.innerText.contains(res.note)) {
			res.altText = linkHTML.innerText
		}

		const foundNote : TFile | undefined = app.vault.getMarkdownFiles().filter(
			x => x.basename == res.note
		).first()

		if (foundNote) {
			const meta = app.metadataCache.getFileCache(foundNote);

			if (meta == undefined || meta?.headings == undefined) {
				return null;
			}

			const h1Line = meta?.headings?.filter(
				h => h.heading == res.h1
			).first()?.position.start.line;

			let h2Line = null;

			if (settings.endInclusive) {
				let h2LineIndex = meta?.headings?.findIndex(
					h => h.heading == res.h2
				)

				if (meta?.headings?.length > h2LineIndex) {
					h2LineIndex += 1
				}
	
				h2Line = meta?.headings?.at(h2LineIndex)?.position.end.line
				
			}
			else {
				h2Line = meta?.headings?.filter(
					h => h.heading == res.h2
				).first()?.position.end.line;
			}

			if (h1Line == undefined) {
				return null;
			}

			res.h1Line = h1Line
			res.h2Line = h2Line

			return res;
		}
	}

	return null;
}

export function postProcessorUpdate(app: App) {
	for (const leaf of app.workspace.getLeavesOfType('markdown')) {
		// Actually of type MarkdownView, but casting to any because the TS types don't have previewMode.renderer or editor.cm... 
		const view = leaf.view as any;

		view.previewMode.renderer.clear();
		view.previewMode.renderer.set(view.editor.cm.state.doc.toString());
	}

	app.workspace.updateOptions();
}
