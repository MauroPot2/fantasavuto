const FALLBACK_ORIGIN = 'https://fantasavuto.web.app';

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function normalizeExternalUrl(value = '') {
  const candidate = String(value).trim();
  if (!candidate) return '';

  try {
    const url = new URL(candidate, FALLBACK_ORIGIN);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.href;
  } catch (_) {
    return '';
  }
}

function renderInlineMarkdown(value) {
  let output = escapeHtml(value);

  output = output.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_, label, url) => {
      const normalized = normalizeExternalUrl(url.replaceAll('&amp;', '&'));
      if (!normalized) return label;
      return `<a href="${escapeHtml(normalized)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    },
  );
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/_([^_]+)_/g, '<em>$1</em>');
  output = output.replace(/`([^`]+)`/g, '<code>$1</code>');

  return output;
}

export function markdownToHtml(markdown = '') {
  const lines = String(markdown).replaceAll('\r\n', '\n').split('\n');
  const output = [];
  let paragraph = [];
  let listType = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) return;
    output.push(`</${listType}>`);
    listType = null;
  };

  for (const sourceLine of lines) {
    const line = sourceLine.trim();

    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length + 1;
      output.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const nextType = ordered ? 'ol' : 'ul';
      if (listType !== nextType) {
        closeList();
        listType = nextType;
        output.push(`<${listType}>`);
      }
      output.push(`<li>${renderInlineMarkdown((unordered || ordered)[1])}</li>`);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  closeList();

  return output.join('\n');
}

export function sortSponsors(sponsors = []) {
  return sortByOrder(sponsors, 'name');
}

export function sortByOrder(items = [], labelKey = 'title') {
  return [...items].sort((a, b) => {
    const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : 9999;
    const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : 9999;
    if (orderA !== orderB) return orderA - orderB;
    return String(a[labelKey] || '').localeCompare(String(b[labelKey] || ''), 'it');
  });
}

export function sortWinners(winners = []) {
  return [...winners].sort((a, b) => {
    const byDate = String(b.date || '').localeCompare(String(a.date || ''));
    return byDate || Number(b.matchday || 0) - Number(a.matchday || 0);
  });
}

export function safeFileName(value = '') {
  const normalized = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+(?=\.)/g, '')
    .replace(/^-+|-+$/g, '');

  return normalized || 'logo';
}

export function formatItalianDate(value = '') {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
