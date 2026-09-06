import { Marked } from './vendor/marked.esm.js';

const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderMarkdown(body, baseUrl) {
  const headings = [];
  let headingNumber = 0;
  const markdown = new Marked({ gfm: true, breaks: false });
  markdown.use({ renderer: {
    html({ text }) { return escape(text); },
    heading({ tokens, depth, text }) {
      const id = `section-${++headingNumber}`;
      if (depth === 2) headings.push({ id, text });
      return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>`;
    },
    code({ text, lang }) {
      const demo = text.trim();
      const allowed = ['frames', 'pixels', 'compression', 'gop', 'bitrate'].includes(demo) || /^decision:(photo|camera|video|compression|obs|post)-[1-4]$/.test(demo);
      if (lang === 'demo' && allowed) return `<div class="lab" data-demo="${demo}"></div>`;
      return `<pre><code>${escape(text)}</code></pre>`;
    },
    link({ href, tokens }) {
      let target;
      try { target = new URL(href, baseUrl); } catch { return this.parser.parseInline(tokens); }
      if (!['http:', 'https:'].includes(target.protocol)) return this.parser.parseInline(tokens);
      const external = target.origin !== new URL(baseUrl).origin;
      return `<a href="${escape(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${this.parser.parseInline(tokens)}</a>`;
    },
    image({ text }) { return `<span>${escape(text)}</span>`; }
  } });
  return { html: markdown.parse(body), headings };
}

