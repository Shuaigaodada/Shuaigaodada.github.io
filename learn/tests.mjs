import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { renderMarkdown } from './markdown.js';
import { readingStats } from './reading.mjs';

const base = 'https://example.com/learn/';
const read = (file) => readFile(new URL(file, import.meta.url), 'utf8');

test('Markdown escapes raw HTML, blocks unsafe links, and restricts executable demos', () => {
  const source = '<script>alert(1)</script>\n\n[x](javascript:alert%281%29)\n\n[x](data:text/html,evil)\n\n[ok](?article=photo-basics)\n\n```demo\nframes\n```\n\n```demo\n<script>alert(2)</script>\n```';
  const { html } = renderMarkdown(source, base);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('href="data:'));
  assert.ok(html.includes('href="?article=photo-basics"'));
  assert.equal((html.match(/data-demo=/g) || []).length, 1);
  assert.ok(html.includes('&lt;script&gt;'));
});

test('Every published article renders with valid related links, demos, and unique heading anchors', async () => {
  const articles = JSON.parse(await read('./articles.json'));
  const labs = await read('./labs.js');
  const ids = new Set(articles.map((a) => a.id));
  assert.equal(ids.size, articles.length);
  const seriesPositions = new Set();
  for (const article of articles) {
    assert.match(article.id, /^[a-z0-9-]+$/);
    if (article.series) {
      assert.ok(Number.isInteger(article.seriesOrder) && article.seriesOrder > 0);
      const position = `${article.series}:${article.seriesOrder}`;
      assert.ok(!seriesPositions.has(position), `Duplicate reading order: ${position}`);
      seriesPositions.add(position);
    }
    const source = await read(`./articles/${article.id}.md`);
    assert.ok(readingStats(source).units >= 6000, `${article.id}: expected substantive half-hour reading length`);
    const { html, headings } = renderMarkdown(source, base);
    assert.ok(headings.length >= 3, article.id);
    const anchors = [...html.matchAll(/id="(section-\d+)"/g)].map((m) => m[1]);
    assert.equal(new Set(anchors).size, anchors.length, article.id);
    for (const heading of headings) assert.ok(anchors.includes(heading.id));
    for (const id of article.related) assert.ok(ids.has(id), `${article.id} -> ${id}`);
    for (const match of source.matchAll(/\]\(\?article=([a-z0-9-]+)\)/g)) assert.ok(ids.has(match[1]), match[1]);
    assert.ok((html.match(/data-demo=/g) || []).length >= 5, `${article.id}: expected at least five interactions`);
    for (const match of source.matchAll(/```demo\s+decision:([a-z]+-[1-4])\s+```/g)) assert.ok(labs.includes(`'${match[1]}':`), `Missing interaction: ${match[1]}`);
    assert.ok(!html.includes('```'), article.id);
    assert.ok(source.includes('https://'), `Missing sources in ${article.id}`);
  }
});

test('Reading time counts prose, excludes links and demos, and rounds up', () => {
  assert.deepEqual(readingStats('像素RGB颜色 [参数](https://example.com/a-long-url)\n```demo\nframes\n```'), {units:7,minutes:1});
  assert.deepEqual(readingStats(''), {units:0,minutes:0});
  assert.equal(readingStats('字'.repeat(6000)).minutes,30);
  assert.equal(readingStats('字'.repeat(6001)).minutes,31);
});

test('Theme startup handles blocked storage, invalid data, and low-contrast saved colors', async () => {
  const script = await read('./theme.js');
  function boot(saved, blocked = false) {
    const values = {};
    const document = { documentElement: { dataset: {}, style: { setProperty: (key, value) => { values[key] = value; } } }, querySelector: () => null, dispatchEvent() {}, addEventListener() {} };
    runInNewContext(script, { document, Event: class {}, localStorage: { getItem() { if (blocked) throw new Error('blocked'); return saved; } } });
    return values;
  }
  assert.equal(boot('invalid')['--paper'], '#f7f8fa');
  assert.equal(boot(null, true)['--paper'], '#f7f8fa');
  assert.equal(boot(JSON.stringify({preset:'dark'}))['--paper'], '#181c22');
  const custom = boot(JSON.stringify({preset:'eye',colors:{background:'#ffffff',text:'#ffffff',accent:'url(evil)'}}));
  assert.equal(custom['--ink'], '#202020');
  assert.equal(custom['--accent'], '#4d7056');
});
