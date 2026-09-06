import { renderMarkdown } from './markdown.js';
import { mountLabs } from './labs.js';
import { readingStats } from './reading.mjs';

const $ = (selector) => document.querySelector(selector);
const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const search = $('#search');
const reader = $('#reader');
if (new URL(location.href).searchParams.has('article')) {
  $('#library').hidden = true;
  reader.hidden = false;
  reader.innerHTML = '<p role="status">正在打开文章…</p>';
}
let articles = [];
let filter = 'all';
let disposeLabs = () => {};
let routeVersion = 0;
const urlFor = (id) => `?article=${encodeURIComponent(id)}`;

function normalize(text) { return text.normalize('NFKC').toLowerCase().replace(/\s+/g, ''); }
function excerpt(article, query) {
  if (!query) return article.subtitle;
  const text = (article.body || article.subtitle).replace(/```[\s\S]*?```/g, '').replace(/[#*`>|]/g, '').replace(/\n+/g, ' ');
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  return index < 0 ? article.subtitle : `${index > 25 ? '…' : ''}${text.slice(Math.max(0, index - 25), index + 65)}…`;
}

function renderCards() {
  const query = search.value.trim();
  const terms = query.normalize('NFKC').replace(/\b([ipb])\s+帧/gi, '$1帧').split(/\s+/).map(normalize).filter(Boolean);
  const matches = articles.filter((article) => (filter === 'all' || article.category === filter) && terms.every((term) => article.searchText.includes(term)));
  $('#article-grid').innerHTML = matches.map((a) => `<a class="article-card" href="${urlFor(a.id)}"><div class="card-top"><span class="card-kicker">${escape(a.label)}</span><span class="card-index">${String(articles.indexOf(a) + 1).padStart(2, '0')}</span></div><h3>${escape(a.title)}</h3><p class="card-summary">${escape(excerpt(a, query))}</p><div class="card-tags">${a.tags.slice(0, 4).map((tag) => `<span>${escape(tag)}</span>`).join('')}</div><div class="card-footer"><span>${a.body === null ? '阅读时间待加载' : `约 ${a.minutes} 分钟`} · ${a.body === null ? '正文暂不可用' : '2026.09.07'}</span><span class="card-open">阅读全文 <span aria-hidden="true">↗</span></span></div></a>`).join('');
  $('#empty-state').hidden = matches.length !== 0;
  const unavailable = articles.filter((a) => a.body === null).length;
  $('#search-status').textContent = `${matches.length} 篇${query ? '匹配文章' : '文章'}${unavailable ? ` · ${unavailable} 篇正文加载失败` : ''}`;
}


function renderSeries(article) {
  if (!article.series) return '';
  const sequence = articles.filter((a) => a.series === article.series).sort((a, b) => a.seriesOrder - b.seriesOrder);
  return `<section class="series-order" aria-label="推荐阅读顺序"><div class="series-heading"><h2>推荐阅读顺序</h2><span>${escape(article.series)}系列</span></div><ol>${sequence.map((a, i) => `<li><a href="${urlFor(a.id)}"${a.id === article.id ? ' aria-current="step"' : ''}><span class="step-number">${String(i + 1).padStart(2, '0')}</span><span><strong>${escape(a.seriesLabel || a.title)}</strong>${a.id === article.id ? '<small>当前文章</small>' : ''}</span></a></li>`).join('')}</ol></section>`;
}

function scrollToAnchor() {
  if (!location.hash) return;
  try { document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(); } catch { /* A malformed fragment should not prevent reading. */ }
}

async function route() {
  const version = ++routeVersion;
  disposeLabs();
  const id = new URL(location.href).searchParams.get('article');
  const isArticle = id !== null;
  $('#library').hidden = isArticle;
  reader.hidden = !isArticle;
  document.querySelectorAll('.chapter-nav a').forEach((link) => {
    if (link.dataset.article === id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (!isArticle) { document.title = '学习文档 · GAO LAB'; $('#breadcrumb').textContent = '文章列表'; scrollToAnchor(); return; }
  const article = articles.find((item) => item.id === id);
  if (!article) { $('#breadcrumb').textContent = '文章未找到'; document.title = '文章未找到 · GAO LAB'; reader.innerHTML = '<div class="reader-error"><h1>这篇文章还不存在</h1><p>地址可能有误，请返回文章列表。</p><a href="./">← 返回文章列表</a></div>'; return; }
  $('#breadcrumb').textContent = article.title;
  document.title = `${article.title} · 学习文档`;
  if (article.body === null) {
    reader.innerHTML = '<div class="reader-error" role="status"><h1>文章暂时没加载出来</h1><p>请检查连接后重试，也可以先读其他文章。</p><button id="retry-article" type="button">重新加载</button> <a href="./">返回文章列表</a></div>';
    $('#retry-article').onclick = async () => {
      $('#retry-article').disabled = true;
      try { article.body = await fetchText(`./articles/${article.id}.md`); Object.assign(article, readingStats(article.body)); article.searchText = normalize([article.title, article.subtitle, ...article.tags, article.body].join(' ')); renderCards(); } catch { /* Keep the retry control available. */ }
      if (version === routeVersion) route();
    };
    return;
  }
  const { html, headings } = renderMarkdown(article.body, location.href);
  reader.innerHTML = `<a class="reader-back" href="./">← 返回文章列表</a><header class="article-header"><p class="eyebrow">NOTE ${String(articles.indexOf(article) + 1).padStart(2, '0')} / ${escape(article.label)}</p><h1>${escape(article.title)}</h1><p class="article-deck">${escape(article.subtitle)}</p><div class="article-meta"><span>完整阅读约 ${article.minutes} 分钟</span><span>更新于 2026.09.07</span><a href="./articles/${article.id}.md" download>↓ Markdown 原文</a></div><p class="reading-note">正文约 ${article.units.toLocaleString()} 字，按每分钟约 200 字估算；英文词计为一个阅读单位。交互操作与实际阅读速度会影响用时。</p></header>${renderSeries(article)}<div class="article-layout"><article class="article-content">${html}</article><aside class="toc"><details open><summary>本文目录 · ${headings.length} 节</summary><nav aria-label="文章目录">${headings.map((h, i) => `<a href="#${h.id}">${String(i + 1).padStart(2, '0')} &nbsp;${escape(h.text)}</a>`).join('')}</nav><p class="toc-note">章节内的交互演示用于说明原理，具体限制标注在演示下方。</p></details></aside></div><section class="related"><p class="eyebrow">RELATED ARTICLES</p><h2>相关文章</h2><div class="related-links">${article.related.map((relatedId) => articles.find((a) => a.id === relatedId)).filter(Boolean).map((a) => `<a href="${urlFor(a.id)}"><span>${escape(a.label)} · 约 ${a.minutes} 分钟</span><strong>${escape(a.title)} ↗</strong></a>`).join('')}</div></section>`;
  if (matchMedia('(max-width: 850px)').matches) reader.querySelector('.toc details').open = false;
  reader.querySelectorAll('table').forEach((table) => { const wrapper = document.createElement('div'); wrapper.className = 'table-scroll'; wrapper.tabIndex = 0; wrapper.setAttribute('role', 'region'); wrapper.setAttribute('aria-label', '参数对照表，可横向滚动'); table.replaceWith(wrapper); wrapper.append(table); });
  disposeLabs = mountLabs(reader);
  scrollToAnchor();
}

async function fetchText(url) { const response = await fetch(url); if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.text(); }

search.addEventListener('input', renderCards);
$('.search').addEventListener('submit', (event) => event.preventDefault());
document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => { filter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button))); renderCards(); }));
$('#clear-search').addEventListener('click', () => { search.value = ''; document.querySelector('[data-filter=all]').click(); search.focus(); });
document.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if ($('#library').hidden) { history.pushState({}, '', './'); route(); } search.focus(); search.scrollIntoView({ block: 'center' }); } });
document.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!link || link.hasAttribute('download') || link.target || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
  const target = new URL(link.href);
  if (target.origin !== location.origin || target.pathname !== location.pathname) return;
  if (target.search === location.search && target.hash) return;
  event.preventDefault();
  history.pushState({}, '', target);
  window.scrollTo(0, 0);
  route();
  $('#main').focus({ preventScroll: true });
});
window.addEventListener('popstate', route);

try {
  articles = JSON.parse(await fetchText('./articles.json'));
  $('.article-count').textContent = `${articles.length} 篇`;
  $('.nav-count').textContent = String(articles.length).padStart(2, '0');
  $('[data-filter="all"] span').textContent = String(articles.length).padStart(2, '0');
  const loaded = await Promise.allSettled(articles.map((a) => fetchText(`./articles/${a.id}.md`)));
  articles.forEach((a, i) => { a.body = loaded[i].status === 'fulfilled' ? loaded[i].value : null; Object.assign(a, readingStats(a.body || '')); a.searchText = normalize([a.title, a.subtitle, ...a.tags, a.body || ''].join(' ')); });
  $('#chapter-nav').innerHTML = articles.map((a, i) => `<a href="${urlFor(a.id)}" data-article="${a.id}"><span class="chapter-number">${String(i + 1).padStart(2, '0')}</span>${escape(a.title)}</a>`).join('');
  renderCards();
  route();
} catch {
  $('#search-status').textContent = '文章目录加载失败，请刷新重试。';
  $('#article-grid').innerHTML = '<p>可以先阅读 <a href="./articles/video-basics.md">视频原理的 Markdown 原文 ↗</a></p>';
  if (new URL(location.href).searchParams.has('article')) { $('#library').hidden = true; reader.hidden = false; reader.innerHTML = '<div class="reader-error"><h1>目录暂时无法加载</h1><p>请刷新重试，或先阅读 <a href="./articles/video-basics.md">Markdown 原文</a>。</p><a href="./">返回文章列表</a></div>'; }
}
