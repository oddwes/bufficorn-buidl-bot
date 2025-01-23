import fetch from 'node-fetch';
import { parse } from 'node-html-parser';

async function parsePage() {
  const response = await fetch('https://www.ethdenver.com/buidl/bv-pitchfest');
  const html = await response.text();
  const root = parse(html);

  console.log(html);
}

parsePage();