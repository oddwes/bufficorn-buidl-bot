import { Provider } from "@elizaos/core";
import { PerformanceTracker } from "../services/performanceTracker.ts";
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import { CachingService } from "../services/cachingservice.ts";

async function getMenuUrls() {
  try {
    const response = await fetch('https://www.ethdenver.com/');
    const html = await response.text();
    const root = parse(html);
    const urls = new Set<string>(); // Use Set to automatically deduplicate

    // Get BUIDL URLs - just use /buidl path
    root.querySelectorAll('a[href^="/buidl"]').forEach(el => {
      const url = 'https://www.ethdenver.com' + el.getAttribute('href');
      urls.add(url);
    });

    // Get Festival URLs
    root.querySelectorAll('a[href^="/activations"]').forEach(el => {
      const text = el.querySelector('.nav-link.menu_purple')?.text.trim();
      if (text && !text.includes('Camp #BUIDL')) {
        const url = 'https://www.ethdenver.com' + el.getAttribute('href');
        urls.add(url);
      }
    });

    return Array.from(urls);
  } catch (error) {
    console.error('Error getting URLs:', error.message);
    return [];
  }
}

function decodeHtml(html: string): string {
  if (!html) return '';
  return html.replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#x27;/g, "'")
             .replace(/&#39;/g, "'")
             .replace(/&nbsp;/g, ' ');
}

async function parsePage(url: string) {
  try {
    const response = await fetch(url);
    const content = await response.text();
    const root = parse(content);

    const pageData = {
      url,
      title: decodeHtml(content.match(/<title>(.*?)<\/title>/)?.[1] || ''),
      description: decodeHtml(content.match(/<section class="openhours-activations">.*?<p.*?>(.*?)<\/p>/s)?.[1]?.trim() || ''),
      location: decodeHtml(content.match(/<strong>.*?Location:<\/strong><br\/>(.*?)<\/p>/)?.[1] || ''),
      schedule: {
        opens: '',
        closes: ''
      },
      faqs: []
    };

    const openSection = root.querySelector('section.section_activity_time:has(div:contains("Open:"))');
    const closeSection = root.querySelector('section.section_activity_time:has(div:contains("Closes:"))');

    if (openSection) {
      const dateDivs = openSection.querySelectorAll('div.activation_date');
      pageData.schedule.opens = decodeHtml(dateDivs[0]?.textContent?.trim() || dateDivs[1]?.textContent?.trim() || '');
    }

    if (closeSection) {
      const dateDivs = closeSection.querySelectorAll('div.activation_date');
      pageData.schedule.closes = decodeHtml(dateDivs[0]?.textContent?.trim() || dateDivs[1]?.textContent?.trim() || '');
    }

    const faqMatches = (content.match(/<div class="text-size-medium-3 faq-header">(.*?)<\/div>/g) || []) as string[];
    const faqAnswerMatches = (content.match(/<p class="paragraph">(.*?)<\/p>/g) || []) as string[];

    faqMatches.forEach((q, i) => {
      const question = decodeHtml((q as string).replace(/<div class="text-size-medium-3 faq-header">/, '')
                       .replace(/<\/div>/, '').trim());
      const answer = decodeHtml(faqAnswerMatches[i] ?
        faqAnswerMatches[i].replace(/<p class="paragraph">/, '')
                          .replace(/<\/p>/, '').trim() : '');
      pageData.faqs.push({ question, answer });
    });

    return pageData;
  } catch (error) {
    console.error(`Error parsing ${url}:`, error.message);
    return null;
  }
}

function formatPageData(pageData) {
  const formatFaqs = faqs => faqs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n');

  return `${pageData.title}\n${pageData.url}\n` +
         `${pageData.description}\n` +
         `Location: ${pageData.location}\n` +
         `Open: ${pageData.schedule.opens}\n` +
         `Close: ${pageData.schedule.closes}\n` +
         (pageData.faqs.length ? `\nFAQs:\n${formatFaqs(pageData.faqs)}` : '');
}

export const conventionInfoProvider: Provider = {
  get: async () => {
      const tracker = new PerformanceTracker();
      const cache = new CachingService<string>('Convention Info', 5 * 60 * 1000);

      return cache.getWithCache(async () => {
          const urls = await getMenuUrls();

          const results = await Promise.all(
              urls.map(async (url) => {
                  const pageData = await parsePage(url);
                  return pageData ? formatPageData(pageData) : '';
              })
          );

          const allContent = results
              .filter(content => content)
              .join('\n' + '-'.repeat(80) + '\n\n');

          tracker.logExecution('Convention Info');
          return allContent;
      });
  }
};