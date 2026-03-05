Great goal. Here’s a practical, repeatable way to generate a crisp PDF that matches your CV layout, both locally and on GitHub.

What I added

Print CSS tuned for PDFs

In _sass/cv.scss under the print block:
@page { size: Letter; margin: 0.5in; }
.cv-wrapper { padding: 0; max-width: none; }
body.cv-layout { font-size: 11pt; }
printBackground: true will be honored by the generator.
This avoids “narrow left column” and scales content appropriately for Letter pages.
One‑click PDF generator (local)

Script: scripts/generate-cv-pdf.mjs using Puppeteer to render http://localhost:<port>/cv/ and save files/MatthewHull-CV.pdf.
Starts a static server on the built _site so relative assets resolve correctly.
Settings: Letter size, 0.5in margins, no extra scaling, respects CSS page size.
NPM tooling

package.json devDeps: puppeteer, http-server.
Script: npm run cv:pdf.
GitHub Actions automation

Workflow: .github/workflows/cv-pdf.yml
Builds the Jekyll site.
Installs Node deps.
Runs the Puppeteer script to produce files/MatthewHull-CV.pdf.
Commits and pushes the PDF if it changed.
Triggers on push to main/master (for CV‑related paths) and on manual run.
How to use it locally

Build the site: bundle exec jekyll build
Generate PDF: npm install then npm run cv:pdf
The file is saved to files/MatthewHull-CV.pdf
How to use it on GitHub

Push to main (or run the workflow manually).
The action will produce and commit files/MatthewHull-CV.pdf.
Your navbar or CV link can point to /files/MatthewHull-CV.pdf.
Why this preserves layout

Uses your actual HTML/CSS rendering path (headless Chrome) with:
print media emulation
CSS @page margins + Letter format
no browser scaling hacks
Your CV layout already disables site chrome and uses a white background, so the result mirrors the on‑screen CV.
Optional refinements

Switch to A4: change @page { size: A4; } and the Puppeteer format to A4.
Tweak print font size: adjust body.cv-layout { font-size: 11pt; }.
Show link underlines: revert the print a { text-decoration: none !important; } to underline if you prefer.
If you want, I can run a quick local check (after you build) to confirm the PDF fills the page cleanly and retains section alignment.