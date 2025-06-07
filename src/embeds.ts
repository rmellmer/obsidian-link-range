import { App, MarkdownRenderer, setIcon, TFile } from "obsidian";
import { LinkRangeSettings } from "./settings";
import { checkLink } from "./utils";

export async function replaceEmbed(app: App, embed: Node, settings: LinkRangeSettings, isMarkdownPost = false) {
	let embedHtml = embed as HTMLElement

	const res = checkLink(app, embedHtml, settings, true, "src");

	const isLinkRange = res !== null && res.h2 !== undefined;
	const file = res?.file
	if (isLinkRange && file !== undefined) {
		const { vault } = app;
		embedHtml.childNodes.forEach(x => {
			x.remove()
		})

		const linkRange = embedHtml.querySelectorAll("div.link-range-embed")

		linkRange.forEach(x => {
			x.remove()
		})

		if (isMarkdownPost) {
			// prevent default embed functionality for markdown post processor
			embedHtml.removeClasses(["internal-embed"])
			// create a child div under embedHtml to place content inside
			embedHtml = embedHtml.createDiv({
				cls: ["internal-embed", "markdown-embed", "inline-embed", "is-loaded", "link-range-embed"]
			})
		}

		embedHtml.setText("")

		embedHtml.createEl("div", {
			cls: ["embed-title", "markdown-embed-title"],
			text: res.altText
		});

		const linkDiv = embedHtml.createDiv({
			cls: ["markdown-embed-link"],
		});

		setIcon(linkDiv, 'link')

		linkDiv.onClickEvent((ev: MouseEvent) => {
			const leaf = app.workspace.getMostRecentLeaf();
			leaf?.openFile(file, {
				state: {
					scroll: res.h1Line
				}
			});
		})

		const fileContent = await vault.cachedRead(file);

		let lines = fileContent.split("\n");
		lines = lines.slice(res.h1Line, res.h2Line);

		const contentDiv = embedHtml.createDiv({
			cls: ["markdown-embed-content"]
		})

		MarkdownRenderer.renderMarkdown(lines.join("\n"), contentDiv, "", null!)
	}				
}
