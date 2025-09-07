// Generate CV PDF from built site using Puppeteer
import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const SITE_DIR = path.resolve('_site');
const OUTPUT = path.resolve('files/MatthewHull-CV.pdf');
const PORT = process.env.CV_PDF_PORT || 4100;

async function serve(dir, port) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['http-server', dir, '-p', String(port), '-c-1', '-s'], { stdio: 'inherit' });
    proc.on('error', reject);
    setTimeout(() => resolve(proc), 1000); // naive wait; http-server is quick
  });
}

async function main() {
  if (!fs.existsSync(SITE_DIR)) {
    console.error('Build directory _site not found. Run `bundle exec jekyll build` first.');
    process.exit(1);
  }

  const server = await serve(SITE_DIR, PORT);
  const browser = await puppeteer.launch({
    headless: 'new',
    // GitHub Actions lacks a Chrome sandbox; disable it for CI.
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const url = `http://localhost:${PORT}/cv/`;
  await page.goto(url, { waitUntil: 'networkidle0' });

  // Ensure the CV layout is in print mode sizing
  await page.emulateMediaType('print');

  await page.pdf({
    path: OUTPUT,
    format: 'Letter',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    scale: 1,
  });

  await browser.close();
  server.kill();
  console.log(`Saved PDF to ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
