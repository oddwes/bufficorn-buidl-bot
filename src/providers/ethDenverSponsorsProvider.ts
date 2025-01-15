import { Provider } from "@elizaos/core";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";

async function parseETHDenverSponsors() {
    try {
        // Fetch the webpage content using node-fetch
        const response = await fetch('https://www.ethdenver.com/');
        const html = await response.text();

        // Create a virtual DOM using JSDOM
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Find the sponsors container
        const sponsorsContainer = document.querySelector('.container-sponsors');
        if (!sponsorsContainer) {
            throw new Error('Sponsors container not found');
        }

        // Initialize the result string
        let output = '';

        // Find all sponsor group lists
        const sponsorGroups = sponsorsContainer.querySelectorAll('div[role="list"]');

        // Process each sponsor group
        sponsorGroups.forEach(group => {
            // Get the group name from the list_* class
            const groupClass: string = Array.from(group.classList)
                .find((className: string) => className.startsWith('list_')) as string;

            if (!groupClass) return;

            const groupName = groupClass.replace('list_', '');

            // Get all sponsor links in this group
            const sponsorLinks = group.querySelectorAll('a[aria-label]');

            // Process sponsor data
            const sponsors = Array.from(sponsorLinks)
                .map((link: Element) => ({
                    name: link.getAttribute('aria-label').replace(/ [Ww]ebsite$/, ''),
                    url: link.getAttribute('href')
                }));

            // Add to output if we found any sponsors
            if (sponsors.length > 0) {
                // Capitalize first letter of group name
                const formattedGroupName = groupName.charAt(0).toUpperCase() + groupName.slice(1);
                output += `${formattedGroupName}:\n`;

                // Add each sponsor with its URL
                sponsors.forEach((sponsor: { name: string; url: string }) => {
                    output += `- ${sponsor.name} (${sponsor.url})\n`;
                });

                // Add blank line between groups
                output += '\n';
            }
        });

        // Clean up JSDOM resources
        dom.window.close();

        return output;
    } catch (error) {
        console.error('Error parsing sponsors:', error);
        throw error;
    }
}

export const ethDenverSponsorsProvider: Provider = {
    get: async () => {
        return await parseETHDenverSponsors();
    },
};

