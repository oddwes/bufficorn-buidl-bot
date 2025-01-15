import { Provider } from "@elizaos/core";
import fetch from "node-fetch";

export const faqProvider: Provider = {
    get: async () => {
        try{
            const docUrl = 'https://docs.google.com/document/d/1B1A6EcZWhPTpN87txdu7kqK6Q1AZH3kwaa7hWtUOQcg/edit?tab=t.0';
            const exportUrl = docUrl.replace(/\/edit.*$/, '/export?format=txt');
            const response = await fetch(exportUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const content = await response.text();

            return content;
        } catch (error) {
            console.error('Error reading document:', error);
            throw error;
        }
    }
};