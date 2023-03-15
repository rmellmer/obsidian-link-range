import { MarkdownView, TFile } from "obsidian";
import { LinkRangeSettings } from "./settings";


export function checkLinkText(href: string, separator: string): any {
	const linkRegex = /([^#|]*)#?([^#|]*)?/;

	const matches = linkRegex.exec(href);

	if (matches == null || matches?.length < 3 || matches[2] == undefined) {
		return false;
	}

	const header = matches[2];
	const split = header.split(separator);

	// our ranged link format is "#h1..h2"
	if (split.length < 2) {
		return false;
	}

	const note = matches[1];
	const h1 = split[0];
	const h2 = split[1];

	return { note, h1, h2 }
}

export function checkLink(linkHTML: HTMLElement, settings: LinkRangeSettings, hrefField = "data-href"): any {
	const href = linkHTML.getAttribute(hrefField);

	if (href == null) {
		return false;
	}

	const res = checkLinkText(href, settings.headingSeparator)

	if (res && app.metadataCache != null) {
		const foundNote : TFile | undefined = app.vault.getMarkdownFiles().filter(
			x => x.basename == res.note
		).first()

		if (foundNote) {
			const meta = app.metadataCache.getFileCache(foundNote);

			if (meta == undefined || meta?.headings == undefined) {
				return false;
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
				return false;
			}

			return {
				note: res.note,
				h1: res.h1,
				h2: res.h2,
				h1Line,
				h2Line
			};
		}
	}

	return false;
}

export function postProcessorUpdate() {
	for (const leaf of app.workspace.getLeavesOfType('markdown')) {
		// Actually of type MarkdownView, but casting to any because the TS types don't have previewMode.renderer or editor.cm... 
		const view = leaf.view as any;

		view.previewMode.renderer.clear();
		view.previewMode.renderer.set(view.editor.cm.state.doc.toString());
	}

	app.workspace.updateOptions();
}
