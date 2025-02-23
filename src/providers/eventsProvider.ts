import { Provider } from "@elizaos/core";
import fetch from "node-fetch";
import { parse } from 'node-html-parser';
import { CachingService } from "../services/cachingService.ts";

async function fetchSchedule() {
    const response = await fetch('https://www.ethdenver.com/schedule');
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
}

function parseEvents(html: string) {
    const root = parse(html);
    const events = [];
    const eventContainers = root.querySelectorAll('.event-item-content');

    eventContainers.forEach(container => {
        const title = container.querySelector('.headeritem')?.text.trim() || '';

        // Try to get ISO date first, fall back to parsing date and time separately
        const dateText = container.querySelector('.text-block-40')?.text.trim() || '';
        const timeText = container.querySelector('.text-block-41')?.text.trim() || '';
        const date = dateText && timeText ? `${dateText} ${timeText}` : '';

        // Extract location - looks for "Captain Ethereum Stage" or similar
        const location = container.querySelector('.rowitem_border')?.text.trim() || '';

        // Extract speakers
        const speakers = container.querySelectorAll('.speakers')
            .map(speaker => speaker.text.trim())
            .filter(name => name)
            .join(', ');

        events.push({title, date, location, speakers});
    });

    return events;
}

async function getCompleteSchedule() {
    try {
        const html = await fetchSchedule();
        return parseEvents(html);
    } catch (error) {
        console.error('Error fetching or parsing schedule:', error);
        return [];
    }
}

async function getScheduleAsString() {
    const schedule = await getCompleteSchedule();

    // Sort events by date
    schedule.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Create the output string
    let output = `## ETHDenver 2025 Schedule (Total Events: ${schedule.length})\n`;

    schedule.forEach(event => {
        output += `${event.title}\n`;
        output += `- Time: ${event.date}\n`;
        output += `- Stage: ${event.location}\n`;
        if (event.speakers) {
            output += `- Speakers: ${event.speakers}\n`;
        }
        output += `\n`;
    });

    return output;
}

const eventsCache = new CachingService<string>('Events');

export const eventsProvider: Provider = {
    get: async () => eventsCache.getWithCache(getScheduleAsString)
};
