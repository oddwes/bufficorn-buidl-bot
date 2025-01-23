import { Provider } from "@elizaos/core";
import fetch from "node-fetch";
import { parse } from 'node-html-parser';
import { CachingService } from "../services/cachingService.ts";

async function getTicketInfo() {
    try {
        const response = await fetch('https://www.ethdenver.com/tickets', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const html = await response.text();
        const root = parse(html);
        let output = 'EVENT PASSES:\n';

        // EVENT PASSES
        const eventPasses = root.querySelectorAll('.pricing23_plans-2-wide .pricing23_plan');
        eventPasses.forEach(plan => {
            const type = plan.querySelector('.heading-style-h6')?.textContent?.trim();
            const price = plan.querySelector('.heading-style-h1')?.textContent?.trim();
            const subtitle = plan.querySelector('.text-weight-medium')?.textContent?.trim();
            const features = Array.from(plan.querySelectorAll('.pricing23_feature'))
                .map(feature => feature.textContent?.trim().replace(/\s+/g, ' '))
                .filter(Boolean);

            output += `${type} - ${price}${subtitle ? ` (${subtitle})` : ''}\n`;
            output += `Features: ${features.join(' | ')}\n\n`;
        });

        // SPORKWHALE VIP PASSES
        output += 'SPORKWHALE VIP PASSES:\n';
        const vipPasses = root.querySelectorAll('.pricing23_plans-3-wide .pricing23_plan');

        vipPasses.forEach(plan => {
            const type = plan.querySelector('.heading-style-h6')?.textContent?.trim();
            const price = plan.querySelector('.heading-style-h1')?.textContent?.trim();
            const subtitle = plan.querySelector('.text-weight-medium')?.textContent?.trim();
            const features = Array.from(plan.querySelectorAll('.pricing23_feature'))
                .map(feature => feature.textContent?.trim().replace(/\s+/g, ' '))
                .filter(Boolean);

            output += `${type} - ${price}${subtitle ? ` (${subtitle})` : ''}\n`;
            output += `Features: ${features.join(' | ')}\n\n`;
        });

        return output;

    } catch (error) {
        return `Error: ${error.message}`;
    }
}

const ticketsCache = new CachingService<string>('Tickets');

export const ticketInfoProvider: Provider = {
    get: () => ticketsCache.getWithCache(getTicketInfo)
};