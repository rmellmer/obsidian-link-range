import { Component, MarkdownRenderer, TFile } from "obsidian";
import { LinkRangeSettings } from "./settings";
import { checkLink } from "./utils";

export async function replaceEmbed(embed: Node, settings: LinkRangeSettings, isMarkdownPost = false) {
	let embedHtml = embed as HTMLElement
	const res = checkLink(embedHtml, settings, true, "src");

	if (res !== null) {
		const { vault } = app;
		const foundNote : TFile | undefined = app.vault.getMarkdownFiles().filter(
			x => x.basename == res.note
		).first()

		if (foundNote) {
			// empty children
			embedHtml.replaceChildren("")
			embedHtml.setText("")

			if (isMarkdownPost) {
				// prevent default embed functionality for markdown post processor
				embedHtml.removeClasses(["internal-embed"])
				embedHtml = embedHtml.createDiv({
					cls: ["internal-embed", "markdown-embed", "inline-embed", "is-loaded"]
				})
			}	

			embedHtml.createEl("h2", {
				text: res.altText
			})

			const linkDiv = embedHtml.createDiv({
				cls: ["markdown-embed-link"],
			});
			const svg = linkDiv.createSvg("svg", {
				attr: {
					width: "24",
					height: "24",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "2"
				},
				cls: ["svg-icon", "lucide-link"]
			})

			// manually create link icon svg
			svg.createSvg("path", {
				attr: {
					d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
				}
			})
			svg.createSvg("path", {
				attr: {
					d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
				}
			})

			linkDiv.onClickEvent((ev: MouseEvent) => {
				const leaf = app.workspace.getMostRecentLeaf();
				leaf?.openFile(foundNote, {
					state: {
						scroll: res.h1Line
					}
				});
			})

			const fileContent = await vault.cachedRead(foundNote);

			let lines = fileContent.split("\n");
			lines = lines.slice(res.h1Line, res.h2Line);

			MarkdownRenderer.renderMarkdown(lines.join("\n"), embedHtml, "", new Component)
		}
	}				
}
