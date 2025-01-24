import { Provider } from "@elizaos/core";
import fetch from "node-fetch";
import { parse } from 'node-html-parser';
import { CachingService } from "../services/cachingService.ts";

let authCookiePromise = null;

async function getAuthCookie() {
    // Use a single promise for concurrent requests
    if (!authCookiePromise) {
        authCookiePromise = fetch("https://www.ethdenver.com/.wf_auth", {
            "headers": {
                "content-type": "application/x-www-form-urlencoded"
            },
            "body": `pass=${process.env.SCHEDULE_PASSWORD}&path=%2Fschedule&page=%2Fschedule`,
            "method": "POST",
            "redirect": "manual",
        }).then(response => {
            const cookie = response.headers.get('set-cookie').split(';')[0];
            // Reset promise after some time
            setTimeout(() => { authCookiePromise = null; }, 50 * 60 * 1000);
            return cookie;
        });
    }
    return authCookiePromise;
}

// Previous helper functions remain the same
async function fetchPage(pageNumber) {
    const url = pageNumber === 1
        ? 'https://www.ethdenver.com/schedule'
        : `https://www.ethdenver.com/schedule?88eb59fc_page=${pageNumber}`;

    const response = await fetch(url, {
        headers: {
            'Cookie': await getAuthCookie()
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.text();
}

function parseEvents(html) {
    const root = parse(html);
    const events = [];
    const sessions = root.querySelectorAll('.sessioncollectionitem');

    sessions.forEach(session => {
        const card = session.querySelector('.itemcard');
        if (card && !card.classList.toString().includes('w-condition-invisible')) {
            const titleElement = session.querySelector('.sessionname');
            const dateElement = session.querySelector('.iso-date');
            const locationElement = session.querySelector('.rowitem_border .startdate');
            const speakersElement = session.querySelector('.text-block-9');

            const title = titleElement ? titleElement.text.trim() : '';
            const isoDate = dateElement ? dateElement.text.trim() : '';
            const date = isoDate ? new Date(isoDate) : null;
            const location = locationElement ? locationElement.text.trim() : '';
            const speakers = speakersElement && !speakersElement.classList.toString().includes('w-dyn-bind-empty')
                ? speakersElement.text.trim()
                : '';

            events.push({
                title,
                date: date ? date.toLocaleString('en-US', {
                    timeZone: 'America/Denver',
                    dateStyle: 'full',
                    timeStyle: 'short'
                }) : '',
                location,
                speakers
            });
        }
    });

    return events;
}

function getTotalPages(root) {
    const pageCount = root.querySelector('.w-page-count');
    if (pageCount) {
        const text = pageCount.text.trim();
        const match = text.match(/\d+\s*\/\s*(\d+)/);
        return match ? parseInt(match[1]) : 1;
    }
    return 1;
}

async function getCompleteSchedule() {
    try {
        const firstPageHtml = await fetchPage(1);
        const firstPageRoot = parse(firstPageHtml);
        const totalPages = getTotalPages(firstPageRoot);

        // Batch requests in groups of 3
        const batchSize = 3;
        const allEvents = [];

        // Process first page
        allEvents.push(...parseEvents(firstPageHtml));

        // Process remaining pages in batches
        for (let i = 2; i <= totalPages; i += batchSize) {
            const batch = Array.from(
                { length: Math.min(batchSize, totalPages - i + 1) },
                (_, index) => fetchPage(i + index)
            );

            const pages = await Promise.all(batch);
            pages.forEach(html => {
                allEvents.push(...parseEvents(html));
            });
        }

        return allEvents;
    } catch (error) {
        console.error('Error fetching or parsing schedule:', error);
        return [];
    }
}

// New function to format schedule as string
async function getScheduleAsString() {
    const schedule = await getCompleteSchedule();

    // Sort events by date
    schedule.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Create the output string
    let output = `ETHDenver 2025 Schedule\n`;
    output += `Total Events: ${schedule.length}\n`;
    output += '\n\n';

    schedule.forEach(event => {
        output += `Event: ${event.title}\n`;
        output += `Time: ${event.date}\n`;
        output += `Stage: ${event.location}\n`;
        if (event.speakers) {
            output += `Speakers: ${event.speakers}\n`;
        }
        output += `\n\n`;
    });

    return output;
}

const eventsCache = new CachingService<string>('Events');

export const eventsProvider: Provider = {
    get: () => eventsCache.getWithCache(getScheduleAsString)
};
