import { Provider } from "@elizaos/core";
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import { CachingService } from "../services/cachingService.ts";

async function getMenuUrls() {
  try {
    const response = await fetch('https://www.ethdenver.com/');
    const html = await response.text();
    const root = parse(html);
    const urls = new Set<string>(); // Use Set to automatically deduplicate

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
      location: '',  // Will be set below
      schedule: {
        opens: '',
        closes: ''
      },
      faqs: []
    };

    // Updated location parsing to skip <strong> content
    const locationSection = root.querySelector('section.activation_location');
    if (locationSection) {
      const paragraph = locationSection.querySelector('.plaintext p');
      if (paragraph) {
        // Remove the <strong> element and get remaining text
        const strongElement = paragraph.querySelector('strong');
        if (strongElement) {
          strongElement.remove();
        }
        pageData.location = decodeHtml(paragraph.textContent?.trim() || '');
      }
    }

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

    // Updated answer parsing to handle both formats
    const faqSections = root.querySelectorAll('.home_12_frequently-asked-questions_answer');
    const faqAnswers = faqSections.map(section => {
      // Try first format (direct paragraph)
      let answer = section.querySelector('p.paragraph')?.textContent;

      // If not found, try second format (richtext with nested paragraphs)
      if (!answer) {
        const richTextDiv = section.querySelector('.w-richtext');
        if (richTextDiv) {
          // Combine all paragraphs and preserve links
          answer = Array.from(richTextDiv.querySelectorAll('p'))
            .map(p => {
              // Replace links with markdown format
              const links = p.querySelectorAll('a');
              let text = p.textContent || '';
              links.forEach(link => {
                const href = link.getAttribute('href');
                const linkText = link.textContent;
                text = text.replace(linkText!, `[${linkText}](${href})`);
              });
              return text;
            })
            .join('\n\n');
        }
      }

      return decodeHtml(answer || '');
    });

    pageData.faqs = faqMatches.map((q, i) => ({
      question: decodeHtml(q.replace(/<div class="text-size-medium-3 faq-header">/, '')
                           .replace(/<\/div>/, '').trim()),
      answer: faqAnswers[i] || ''
    }));

    return pageData;
  } catch (error) {
    console.error(`Error parsing ${url}:`, error.message);
    return null;
  }
}

function formatPageData(pageData) {
  const formatFaqs = faqs => {
    if (!faqs.length) return '';

    let faqOutput = '\n## Frequently Asked Questions\n\n';
    let currentCategory = '';

    faqs.forEach(faq => {
      // Check if question starts with a category (e.g., "Application & Eligibility:")
      const categoryMatch = faq.question.match(/^([^:]+):/);
      if (categoryMatch) {
        const newCategory = categoryMatch[1].trim();
        if (newCategory !== currentCategory) {
          currentCategory = newCategory;
          faqOutput += `### ${currentCategory}\n\n`;
        }
        // Remove category from question
        faq.question = faq.question.replace(/^[^:]+:\s*/, '');
      }

      faqOutput += `**${faq.question}**\n${faq.answer}\n\n`;
    });

    return faqOutput;
  };

  return `## ${pageData.title}\n${pageData.url}\n\n` +
         `${pageData.description}\n\n` +
         `Location: ${pageData.location}\n\n` +
         `Open: ${pageData.schedule.opens}\n\n` +
         `Close: ${pageData.schedule.closes}\n\n` +
         formatFaqs(pageData.faqs);
}

async function getConventionInfo() {
  const urls = await getMenuUrls();
  const results = await Promise.all(
    urls.map(async (url) => {
      const pageData = await parsePage(url);
      return pageData ? formatPageData(pageData) : '';
    })
  );
  const allContent = results
    .filter(content => content)
    .join('\n');

  return allContent;
}

const conventionInfoCache = new CachingService<string>('Convention Info');

export const conventionInfoProvider: Provider = {
  get: async () => conventionInfoCache.getWithCache(getConventionInfo)
};