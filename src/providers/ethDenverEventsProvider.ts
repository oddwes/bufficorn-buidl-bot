import { Provider } from "@elizaos/core";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";

async function getAuthCookie() {
    const response = await fetch("https://www.ethdenver.com/.wf_auth", {
        "headers": {
            "content-type": "application/x-www-form-urlencoded"
        },
        "body": `pass=${process.env.SCHEDULE_PASSWORD}&path=%2Fschedule&page=%2Fschedule`,
        "method": "POST",
        "redirect": "manual",
    }).then(response => {
        return response.headers.get('set-cookie').split(';')[0]
    });
    return response;
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

function parseEvents(doc) {
    const events = [];
    const sessions = doc.querySelectorAll('.sessioncollectionitem');

    sessions.forEach(session => {
        const card = session.querySelector('.itemcard');
        if (card && !card.classList.contains('w-condition-invisible')) {
            const titleElement = session.querySelector('.sessionname');
            const dateElement = session.querySelector('.iso-date');
            const locationElement = session.querySelector('.rowitem_border .startdate');
            const speakersElement = session.querySelector('.text-block-9');

            const title = titleElement ? titleElement.textContent.trim() : '';
            const isoDate = dateElement ? dateElement.textContent.trim() : '';
            const date = isoDate ? new Date(isoDate) : null;
            const location = locationElement ? locationElement.textContent.trim() : '';
            const speakers = speakersElement && !speakersElement.classList.contains('w-dyn-bind-empty')
                ? speakersElement.textContent.trim()
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

function getTotalPages(doc) {
    const pageCount = doc.querySelector('.w-page-count');
    if (pageCount) {
        const text = pageCount.textContent.trim();
        const match = text.match(/\d+\s*\/\s*(\d+)/);
        return match ? parseInt(match[1]) : 1;
    }
    return 1;
}

async function getCompleteSchedule() {
    try {
        let allEvents = [];
        let currentPage = 1;

        const firstPageHtml = await fetchPage(1);
        const firstPageDom = new JSDOM(firstPageHtml);
        const totalPages = getTotalPages(firstPageDom.window.document);

        while (currentPage <= totalPages) {
            const html = currentPage === 1 ? firstPageHtml : await fetchPage(currentPage);
            const dom = new JSDOM(html);
            const events = parseEvents(dom.window.document);

            allEvents = allEvents.concat(events);
            currentPage++;

            if (currentPage <= totalPages) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
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

export const ethDenverEventsProvider: Provider = {
    get: async () => {
        return await getScheduleAsString();
    },
};

