import { MarkdownPostProcessorContext } from "obsidian";
import { replaceEmbed } from "./embeds";
import { LinkRangeSettings } from "./settings";
import { checkLink } from "./utils";

const NOTE_PLACEHOLDER = "$note"
const H1_PLACEHOLDER = "$h1"
const H2_PLACEHOLDER = "$h2"

export function linkRangePostProcessor(el: HTMLElement, ctx: MarkdownPostProcessorContext, settings: LinkRangeSettings): void {
	const links = el.querySelectorAll('a.internal-link');

	// Handle links
	links.forEach(link => { 
		const htmlLink = link as HTMLElement
		const res = checkLink(htmlLink, settings);

		if (res !== false) {
			let altText = settings.altFormat;
			altText = altText.replace(NOTE_PLACEHOLDER, res.note)
			altText = altText.replace(H1_PLACEHOLDER, res.h1)
			altText = altText.replace(H2_PLACEHOLDER, res.h2)
			htmlLink.setText(altText)
			htmlLink.setAttribute("href", res.note + "#" + res.h1);
			htmlLink.setAttribute("data-href", res.note + "#" + res.h1);
			htmlLink.setAttribute("range-href", res.note + "#" + res.h1 + settings.headingSeparator + res.h2);
		}
	});

	// Handle embeds
	const embeds = el.querySelectorAll('span.internal-embed');

	embeds.forEach(embed => {
		replaceEmbed(embed, settings)	
	});
}
