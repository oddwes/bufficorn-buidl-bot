import { Provider } from "@elizaos/core";
import fetch from "node-fetch";
import { parse } from 'node-html-parser';
import { CachingService } from "../services/cachingService.ts";

async function getFaqContent() {
    try {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const response = await fetch('https://www.ethdenver.com/tickets');

        const html = await response.text();
        const root = parse(html);
        const faqAccordions = root.querySelectorAll('.home_12_frequently-asked-questions_accordion');

        let output = '===========================\nETHDenver Account Creation FAQ\n';

        faqAccordions.forEach(accordion => {
            const question = accordion.querySelector('.home_12_frequently-asked-questions_question .text-size-medium-3')?.textContent.trim();
            const answer = accordion.querySelector('.home_12_frequently-asked-questions_answer')?.textContent.trim().replace(/\s+/g, ' ');

            if (question && answer) {
                output += `${question}: ${answer}\n`;
            }
        });
        output += '===========================\n';

        if (process.env.DEBUG) {
            console.log(output);
        }
        return output;
    } catch (error) {
        return `Error fetching content: ${error.message}`;
    }
}

const faqCache = new CachingService<string>('Account Creation FAQ');

export const accountCreationFaqProvider: Provider = {
    get: () => faqCache.getWithCache(getFaqContent)
};