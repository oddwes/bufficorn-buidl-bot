import { Provider } from "@elizaos/core";
import fetch, { Response as FetchResponse } from "node-fetch";
import { CachingService } from "../services/cachingService.ts";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isTimeoutError = (error: any): boolean => {
    return error.name === 'TimeoutError' ||
           error.type === 'request-timeout' ||
           error.message.includes('timeout');
};

const fetchWithRetry = async (url: string, maxRetries: number = 2): Promise<FetchResponse> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error: any) {
            lastError = error;

            // Only retry on timeout errors
            if (!isTimeoutError(error) || attempt === maxRetries) {
                throw error;
            }

            console.warn(`Attempt ${attempt + 1} failed, retrying after ${(attempt + 1) * 1000}ms...`);
            await sleep((attempt + 1) * 1000); // Exponential backoff: 1s, 2s
        }
    }

    throw lastError;
};

async function getFaqContent() {
    try {
        const docUrl = 'https://docs.google.com/document/d/1B1A6EcZWhPTpN87txdu7kqK6Q1AZH3kwaa7hWtUOQcg/edit?tab=t.0';
        const exportUrl = docUrl.replace(/\/edit.*$/, '/export?format=txt');

        const response = await fetchWithRetry(exportUrl);
        const content = await response.text();

        if (process.env.DEBUG) {
            console.log(content);
        }

        return content;
    } catch (error) {
        return `Error fetching content: ${error.message}`;
    }
}

const faqCache = new CachingService<string>('FAQ');

export const faqProvider: Provider = {
    get: () => faqCache.getWithCache(getFaqContent)
};