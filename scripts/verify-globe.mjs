import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';

function findChrome() {
  if (process.env.CHROME_PATH) {
    if (!fs.existsSync(process.env.CHROME_PATH)) {
      throw new Error(`CHROME_PATH 不存在: ${process.env.CHROME_PATH}`);
    }
    return process.env.CHROME_PATH;
  }

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (found) return found;

  try {
    const fromPath = execFileSync('which', ['google-chrome'], { encoding: 'utf8' }).trim();
    if (fromPath) return fromPath;
  } catch {
    // which 不可用时继续抛出明确错误
  }

  throw new Error('未找到 Chrome/Chromium。请安装浏览器，或设置环境变量 CHROME_PATH。');
}

const chromePath = findChrome();
const url = process.env.APP_URL ?? 'http://127.0.0.1:5173/';
const outputDir = path.resolve('artifacts');

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

function analyzePng(buffer) {
  const png = PNG.sync.read(buffer);
  const uniqueColors = new Set();
  let litPixels = 0;

  for (let index = 0; index < png.data.length; index += 4) {
    const red = png.data[index];
    const green = png.data[index + 1];
    const blue = png.data[index + 2];
    const alpha = png.data[index + 3];
    const brightness = red + green + blue;

    if (alpha > 0 && brightness > 32) {
      litPixels += 1;
    }

    uniqueColors.add(`${red >> 4}-${green >> 4}-${blue >> 4}-${alpha >> 6}`);
  }

  return {
    litPixels,
    uniqueColors: uniqueColors.size,
    width: png.width,
    height: png.height,
  };
}

fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});

const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.hologram-canvas', { state: 'attached', timeout: 10000 });
    await page.waitForTimeout(1600);

    const meta = await page.evaluate(() => {
      const canvas = document.querySelector('.hologram-canvas');
      const globe = document.querySelector('.hologram-globe');
      const rect = canvas.getBoundingClientRect();
      const globeRect = globe.getBoundingClientRect();
      const style = window.getComputedStyle(canvas);
      const globeStyle = window.getComputedStyle(globe);

      return {
        canvas: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          pointerEvents: style.pointerEvents,
        },
        globe: {
          x: globeRect.x,
          y: globeRect.y,
          width: globeRect.width,
          height: globeRect.height,
          pointerEvents: globeStyle.pointerEvents,
        },
      };
    });

    const clip = {
      x: Math.max(0, Math.floor(meta.canvas.x)),
      y: Math.max(0, Math.floor(meta.canvas.y)),
      width: Math.max(1, Math.floor(meta.canvas.width)),
      height: Math.max(1, Math.floor(meta.canvas.height)),
    };
    const screenshot = await page.screenshot({ clip });
    const screenshotPath = path.join(outputDir, `${viewport.name}-globe.png`);
    fs.writeFileSync(screenshotPath, screenshot);

    const pixels = analyzePng(screenshot);
    const rightAnchored = meta.globe.x + meta.globe.width > viewport.width * 0.74;
    const bottomAnchored = meta.globe.y + meta.globe.height > viewport.height * 0.76;
    const passes =
      meta.canvas.pointerEvents === 'none' &&
      meta.globe.pointerEvents === 'none' &&
      meta.canvas.width >= 180 &&
      meta.canvas.height >= 180 &&
      rightAnchored &&
      bottomAnchored &&
      pixels.litPixels > 300 &&
      pixels.uniqueColors > 24;

    results.push({
      viewport: viewport.name,
      passes,
      meta,
      pixels,
      screenshotPath,
    });

    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));

if (results.some((result) => !result.passes)) {
  process.exitCode = 1;
}
