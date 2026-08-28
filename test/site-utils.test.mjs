import test from 'node:test';
import assert from 'node:assert/strict';

import {
  escapeHtml,
  markdownToHtml,
  normalizeExternalUrl,
  safeFileName,
  sortSponsors,
} from '../web/site-utils.js';

test('escapeHtml neutralizza markup non attendibile', () => {
  assert.equal(
    escapeHtml('<script>alert("x")</script>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
  );
});

test('markdownToHtml produce titoli, paragrafi ed elenchi sicuri', () => {
  const html = markdownToHtml(
    '# Regolamento\n\nTesto **importante**.\n\n- Uno\n- Due\n\n<script>x</script>',
  );

  assert.match(html, /<h2>Regolamento<\/h2>/);
  assert.match(html, /<strong>importante<\/strong>/);
  assert.match(html, /<ul>\s*<li>Uno<\/li>\s*<li>Due<\/li>\s*<\/ul>/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
});

test('normalizeExternalUrl accetta solo http e https', () => {
  assert.equal(normalizeExternalUrl('javascript:alert(1)'), '');
  assert.equal(normalizeExternalUrl('https://example.com'), 'https://example.com/');
});

test('sortSponsors usa ordine e nome', () => {
  const result = sortSponsors([
    { name: 'Zulu', order: 20 },
    { name: 'Beta', order: 10 },
    { name: 'Alfa', order: 10 },
  ]);
  assert.deepEqual(result.map((item) => item.name), ['Alfa', 'Beta', 'Zulu']);
});

test('safeFileName normalizza accenti e caratteri speciali', () => {
  assert.equal(safeFileName('Caffè del Savuto!.PNG'), 'caffe-del-savuto.png');
});
