import test from 'node:test';
import assert from 'node:assert/strict';

import {
  escapeHtml,
  markdownToHtml,
  normalizeExternalUrl,
  safeFileName,
  sortByOrder,
  sortSponsors,
  sortWinners,
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

test('sortByOrder ordina contenuti editoriali', () => {
  const result = sortByOrder([{ title: 'Premi', order: 30 }, { title: 'Mercato', order: 10 }, { title: 'Formazioni', order: 10 }]);
  assert.deepEqual(result.map((item) => item.title), ['Formazioni', 'Mercato', 'Premi']);
});

test('sortWinners mostra prima il risultato più recente', () => {
  const result = sortWinners([{ date: '2026-01-10', matchday: 18 }, { date: '2026-02-20', matchday: 24 }, { date: '2026-02-20', matchday: 25 }]);
  assert.deepEqual(result.map((item) => item.matchday), [25, 24, 18]);
});
