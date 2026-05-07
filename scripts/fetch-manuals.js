/**
 * Bootstraps data/model-tasks.json by fetching maintenance sections from ManualsLib.
 *
 * Usage:
 *   node scripts/fetch-manuals.js
 *
 * For each TARGETS entry, this script:
 *   1. Fetches the ManualsLib manual TOC page
 *   2. Finds pages listed under maintenance/care sections
 *   3. Fetches those pages and saves raw HTML to data/manual-raw/
 *
 * After running, manually curate data/manual-raw/ into data/model-tasks.json.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, "../data/manual-raw");
mkdirSync(RAW_DIR, { recursive: true });

// Add entries here as you need to fetch new manuals.
// tocUrl: the ManualsLib manual TOC page (e.g. /manual/{id}/{slug}.html)
// maintenanceKeywords: section heading text fragments that indicate a maintenance/care section
const TARGETS = [
  {
    key: "LG|Refrigerator|LF21G6200S",
    tocUrl: "https://www.manualslib.com/manual/3240605/lg-lf21g6200s.html",
    maintenanceKeywords: ["care", "clean", "filter", "maintenance"],
  },
  {
    key: "Whirlpool|Dishwasher|WDT750SAKZ",
    // WDT750SAKW is same hardware generation (different color); use that manual
    tocUrl: "https://www.manualslib.com/manual/1966772/whirlpool-wdt750sakw.html",
    maintenanceKeywords: ["care", "clean", "filter", "maintenance"],
  },
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

async function fetchText(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function extractMaintenancePageUrls(tocHtml, baseUrl, keywords) {
  // Parse TOC entries: <a href="/manual/.../page-N.html">Section Title</a>
  const linkRe = /<a[^>]+href="(\/manual\/[^"]+\.html)"[^>]*>([^<]+)<\/a>/gi;
  const found = [];
  let m;
  while ((m = linkRe.exec(tocHtml)) !== null) {
    const href = m[1];
    const label = m[2].toLowerCase();
    if (keywords.some(kw => label.includes(kw))) {
      found.push({ label: m[2].trim(), url: `https://www.manualslib.com${href}` });
    }
  }
  return found;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function processTarget(target) {
  console.log(`\n=== ${target.key} ===`);
  console.log(`Fetching TOC: ${target.tocUrl}`);

  let tocHtml;
  try {
    tocHtml = await fetchText(target.tocUrl);
  } catch (err) {
    console.error(`  TOC fetch failed: ${err.message}`);
    return;
  }

  const pages = extractMaintenancePageUrls(tocHtml, target.tocUrl, target.maintenanceKeywords);

  if (pages.length === 0) {
    console.log("  No maintenance sections found in TOC.");
    // Save TOC itself for manual inspection
    const outPath = join(RAW_DIR, `${slugify(target.key)}-toc.html`);
    writeFileSync(outPath, tocHtml, "utf8");
    console.log(`  Saved full TOC → ${outPath}`);
    return;
  }

  console.log(`  Found ${pages.length} maintenance section(s):`);
  for (const page of pages) {
    console.log(`    "${page.label}" → ${page.url}`);
  }

  for (const page of pages) {
    try {
      const html = await fetchText(page.url);
      const filename = `${slugify(target.key)}--${slugify(page.label)}.html`;
      const outPath = join(RAW_DIR, filename);
      writeFileSync(outPath, html, "utf8");
      console.log(`  Saved → ${filename}`);
    } catch (err) {
      console.error(`  Failed to fetch "${page.label}": ${err.message}`);
    }
    // Polite delay between page requests
    await new Promise(r => setTimeout(r, 800));
  }
}

for (const target of TARGETS) {
  await processTarget(target);
}

console.log("\nDone. Review files in data/manual-raw/ and curate into data/model-tasks.json.");
