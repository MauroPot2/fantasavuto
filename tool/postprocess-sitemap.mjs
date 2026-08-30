import { readFile, writeFile } from 'node:fs/promises';

const sitemapPath = 'build/jaspr/sitemap.xml';
const excludedPaths = new Set(['/admin', '/competizioni/dettaglio']);

const xml = await readFile(sitemapPath, 'utf8');
let removed = 0;

const cleaned = xml.replace(/\s*<url>\s*[\s\S]*?<\/url>/g, (block) => {
  const match = block.match(/<loc>([^<]+)<\/loc>/);
  if (!match) return block;

  const rawLocation = match[1].replaceAll('&amp;', '&');
  try {
    const url = new URL(rawLocation);
    if (!excludedPaths.has(url.pathname)) return block;
    removed += 1;
    return '';
  } catch (_) {
    return block;
  }
});

await writeFile(sitemapPath, `${cleaned.trim()}\n`, 'utf8');
console.log(`SEO sitemap: rimosse ${removed} route non indicizzabili.`);
