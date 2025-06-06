import { App, TFile } from "obsidian";
import { LinkRangeSettings, Pattern } from "./settings";
import * as path from 'path';

export interface ParsedLink {
	note: string;
	h1: string;
	h2?: string;
	altText?: string;
	file?: TFile;
	h1Line?: number;
	h2Line?: number;
}

export function checkLinkText(href: string, settings: LinkRangeSettings): ParsedLink | null {
	const linkRegex = /([^#|]*)#?([^#|]*)?\|?(.*)?/;

	const matches = linkRegex.exec(href);

	if (matches == null || matches?.length < 3 || matches[2] == undefined) {
		return null;
	}

	const header = matches[2];
	const split = header.split(settings.headingSeparator);

	const note = matches[1];
	const h1 = split[0];
	const h2 = split[1];

	let altText = undefined;

	if (matches?.length > 3 && matches[3] != undefined) {
		altText = matches[3]
	}
	else {
		const pattern = findPatternForFile(note, settings);
		const baseNote = path.basename(note)
		const headingVisual = pattern.headingVisual === '' ? '#' : pattern.headingVisual;
		const headingSeparatorVisual = pattern.headingSeparatorVisual === '' ? settings.headingSeparator : pattern.headingSeparatorVisual;

		if (h2 !== undefined) {
			altText = `${baseNote}${headingVisual}${h1}${headingSeparatorVisual}${h2}`
		}
		else {
			altText = `${baseNote}${headingVisual}${h1}`
		}
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

	if (!res || app.metadataCache == null) {
		return null;
	}

	// non-standard alt text, must be user provided via "|"
	if (alt != null && !alt.contains(res.note)) {
		res.altText = alt
	}

	if (!isEmbed && !linkHTML.innerText.contains(res.note)) {
		res.altText = linkHTML.innerText
	}

	// Locate the referenced file, including partial paths
	const partialPath = res.note + ".md"
	const basePart = path.basename(res.note)
	const file : TFile | undefined = app.vault.getMarkdownFiles().filter(
		x => x.basename == basePart && x.path.endsWith(partialPath)
	).first()

	if (!file) {
		return null
	}
	
	res.file = file

	const meta = app.metadataCache.getFileCache(file);

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

export function postProcessorUpdate(app: App) {
	for (const leaf of app.workspace.getLeavesOfType('markdown')) {
		// Actually of type MarkdownView, but casting to any because the TS types don't have previewMode.renderer or editor.cm... 
		const view = leaf.view as any;

		view.previewMode.renderer.clear();
		view.previewMode.renderer.set(view.editor.cm.state.doc.toString());
	}

	app.workspace.updateOptions();
}

export function findPatternForFile(fileName: string, settings: LinkRangeSettings) : Pattern {
	const file = app.vault.getFiles().find((file) => file.basename === fileName);

	let pattern = [...settings.patterns].reverse().find((pattern: Pattern) => file?.path.startsWith(pattern.path))
	if (!pattern) {
		pattern = settings.getDefaultPattern();
	}

	return pattern;
}
