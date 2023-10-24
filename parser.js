import fs from 'fs';

import { Command } from 'commander';
import { OpenAI } from 'openai';
import puppeteer from 'puppeteer';

const program = new Command();

program.name('site parser').description('CLI to parse website link');

const ai = new OpenAI({
  apiKey: '',
});

program
  .command('links')
  .argument('url', 'Url of site which will be parsed')
  .description('Get links from site')
  .action(async (url) => {
    const browser = await puppeteer.launch({
      headless: true,
    });

    // Open a new tab
    const page = await browser.newPage();
    const site = new URL(url);

    await page.goto(site.href, { waitUntil: 'networkidle2' });

    // Interact with the DOM to retrieve the titles
    const titles = await page.evaluate(() => {
      // Select all elements with crayons-tag class
      return [...document.querySelectorAll('a')].map((el) => {
        if (el.href.length && el.href.includes(window.location.host)) {
          return el.href;
        }
        return undefined;
      });
    });

    await browser.close();

    [...new Set(titles)]
      .filter(Boolean)
      .forEach((title) => console.log(`${title}`));
  });

program
  .command('text')
  .argument('url', 'Url of site which will be parsed')
  .description('Get text from site')
  .action(async (url) => {
    const browser = await puppeteer.launch({
      headless: true,
    });

    // Open a new tab
    const page = await browser.newPage();
    const site = new URL(url);

    await page.goto(site.href, { waitUntil: 'networkidle2' });

    const extractedText = await page.$eval('*:not(a)', (el) =>
      el.innerText.length > 20 ? el.innerText : undefined
    );

    await browser.close();
    console.log(url + ' - has been parsed');
    const response = await ai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: `Please generate dataset with 10 items for fine-tune model using the given text : Text"""{${extractedText}}""" and generate dataset in format like the following conversation: """{"messages": [{"role": "system", "content": "Marv is a factual chatbot that is also sarcastic."}, {"role": "user", "content": "Whats the capital of France?"}, {"role": "assistant", "content": "Paris, as if everyone doesnt know that already."}]}"""`,
        },
      ],
      temperature: 0.5,
    });
    console.log(`Dataset for ${url} generated`);
    fs.writeFileSync('./jobId.jsonl', response.choices[0].message.content);
  });

program.parseAsync();
