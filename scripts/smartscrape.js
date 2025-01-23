import fetch from 'node-fetch';
import { parse } from 'node-html-parser';

async function scrapeMenu() {
 try {
   const response = await fetch('https://www.ethdenver.com/');
   const html = await response.text();
   const root = parse(html);

   const menuItems = {
     buidl: [],
     festival: []
   };

   root.querySelectorAll('a[href^="/buidl"], a[href^="/activations/camp-buidl"]').forEach(el => {
     const text = el.querySelector('.nav-link.menu_purple')?.text.trim();
     const url = 'https://www.ethdenver.com' + el.getAttribute('href');
     if (text) menuItems.buidl.push({ text, url });
   });

   root.querySelectorAll('a[href^="/activations"]').forEach(el => {
     const text = el.querySelector('.nav-link.menu_purple')?.text.trim();
     const url = 'ethdenver.com' + el.getAttribute('href');
     if (text && !text.includes('Camp #BUIDL')) {
       menuItems.festival.push({ text, url });
     }
   });

   console.log('Menu Items:', menuItems);
 } catch (error) {
   console.error('Error:', error.message);
 }
}

scrapeMenu();