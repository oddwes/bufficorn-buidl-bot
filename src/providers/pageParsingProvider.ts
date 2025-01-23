import { Provider } from "@elizaos/core";
import { PerformanceTracker } from "../services/performanceTracker.ts";

const urls = [
    'https://www.ethdenver.com/buidl/bv-pitchfest',
    'https://www.ethdenver.com/activations/babysitting',
    'https://www.ethdenver.com/activations/art-gallery',
]

async function getPageParsing(urls: string[]): Promise<string> {
    let results = '';

    await Promise.all(urls.map(async (url) => {
        const response = await fetch(url);
        const html = await response.text();
        results += html;
    }));

    return results;
}

export const pageParsingProvider: Provider = {
    get: async () => {
        const tracker = new PerformanceTracker();
        const result = await getPageParsing(urls);
        tracker.logExecution('Page Parsing');
        console.log(result);
        return result;
    }
};