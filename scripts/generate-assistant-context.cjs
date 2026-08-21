const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'assistant-context.json');
const forbidden = [/à renseigner/iu, /à confirmer/iu, /à valider/iu, /validation médicale à confirmer/iu];
const entities = { nbsp: ' ', amp: '&', quot: '"', apos: "'", '#39': "'", eacute: 'é', Eacute: 'É', agrave: 'à', Agrave: 'À', rsquo: '’', ndash: '–' };
const decode = (text) => text.replace(/&([\w#]+);/g, (entity, name) => entities[name] ?? entity);
const attribute = (tag, name) => {
  const match = tag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, 'i'));
  return match ? decode(match[1] ?? match[2]) : '';
};

function extractBlocks(html) {
  const tokens = [...html.matchAll(/<\/?([a-z][\w:-]*)\b[^>]*>/gi)];
  const stack = [];
  const blocks = [];
  for (const token of tokens) {
    const raw = token[0];
    const tag = token[1].toLowerCase();
    if (raw.startsWith('</')) {
      const opening = stack.pop();
      if (!opening || opening.tag !== tag) throw new Error(`HTML non équilibré près de ${raw}`);
      if (opening.source) blocks.push({ ...opening.source, fragment: html.slice(opening.end, token.index) });
    } else if (!raw.endsWith('/>') && !['br', 'img', 'meta', 'link', 'input', 'hr'].includes(tag)) {
      const id = attribute(raw, 'data-assistant-source');
      stack.push({ tag, end: token.index + raw.length, source: id ? { id, title: attribute(raw, 'data-assistant-title'), type: attribute(raw, 'data-assistant-type') || 'practical' } : null });
    }
  }
  return blocks;
}

function clean(fragment) {
  return decode(fragment.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();
}

function generate() {
  const pages = fs.readdirSync(root).filter((file) => file.endsWith('.html')).sort();
  const entries = [];
  const ids = new Set();
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const block of extractBlocks(html)) {
      const text = clean(block.fragment);
      if (!text || forbidden.some((marker) => marker.test(text))) throw new Error(`Source assistant refusée (${page}#${block.id})`);
      if (ids.has(block.id)) throw new Error(`ID assistant dupliqué: ${block.id}`);
      ids.add(block.id);
      const links = [...block.fragment.matchAll(/<a\b[^>]*\shref=(?:"([^"]+)"|'([^']+)')[^>]*>/gi)].map((match) => decode(match[1] ?? match[2]));
      entries.push({ id: block.id, page, title: block.title || text.split('\n')[0], text, url: page, type: block.type, ...(links.length ? { links: [...new Set(links)] } : {}) });
    }
  }
  entries.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  return { version: 1, source: 'public-site', entries };
}

fs.writeFileSync(output, `${JSON.stringify(generate(), null, 2)}\n`);
console.log(`Assistant context generated: ${path.relative(root, output)}`);
