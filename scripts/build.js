#!/usr/bin/env node
/* Build markli.info into docs/ (the folder GitHub Pages serves).
   Input:  sources/<slug>/meta.json + the Word documents it names.
   Output: docs/ with home, articles, topics, about, 404, rss.xml, sitemap.xml. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mammoth = require("mammoth");
const OpenCC = require("opencc-js");
const cfg = require("./site.config");
const T = require("./i18n");
const { bannerSvg, cursorSvg } = require("./banner");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "sources");
const OUT = path.join(ROOT, "docs");
const LANGS = ["en", "hans", "hant"];
const HL = { en: "en", hans: "zh-Hans", hant: "zh-Hant" };
const FALLBACK = { en: ["hans", "hant"], hans: ["hant", "en"], hant: ["hans", "en"] };
const toHant = OpenCC.Converter({ from: "cn", to: cfg.openccTarget });
const B = cfg.base;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const strip = (h) => h.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();
const fmtDate = (d, l) => { const [y, m, dd] = d.split("-").map(Number); return l === "en" ? `${MONTHS[m - 1]} ${dd}, ${y}` : `${y}年${m}月${dd}日`; };
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();

/* One element per language; CSS shows only the active one. */
function tr(key, ...args) {
  return LANGS.map((l) => { let v = T[l][key]; if (typeof v === "function") v = v(...args); return `<span data-l="${l}" lang="${HL[l]}">${esc(v)}</span>`; }).join("");
}
function multi(byLang, tag = "span", cls = "") {
  return LANGS.map((l) => `<${tag} data-l="${l}" lang="${HL[l]}"${cls ? ` class="${cls}"` : ""}>${byLang[l]}</${tag}>`).join("");
}
const tips = (key) => LANGS.map((l) => `data-tip-${l}="${esc(T[l][key])}"`).join(" ");

/* ---------- Word -> HTML ---------- */
const HEAD_MARK = /^(TL;?DR|核心观点|核心觀點|摘要)/i;
const REF_HEAD = /^(References|Sources|Notes|Bibliography|主要参考资料|参考资料|参考文献|注释|主要參考資料|參考資料|參考文獻|註釋)$/i;
const linkify = (h) => (/<a\s/.test(h) ? h : h.replace(/(https?:\/\/[^\s<，。）)]+)/g, (u) => `<a href="${u}" rel="noopener">${u}</a>`));

async function docxToBlocks(file, imgDir, imgUrl, counter) {
  const r = await mammoth.convertToHtml({ path: file }, {
    styleMap: ["p[style-name='Title'] => p.doc-title:fresh", "p[style-name='Subtitle'] => p.doc-sub:fresh",
      "p[style-name='Pull Quote'] => blockquote.pullquote > p:fresh", "p[style-name='Quote'] => blockquote > p:fresh",
      "p[style-name='Intense Quote'] => blockquote.pullquote > p:fresh"],
    convertImage: mammoth.images.imgElement(async (img) => {
      const buf = await img.readAsBuffer();
      const ext = ((img.contentType || "image/png").split("/")[1] || "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
      const name = `img-${++counter.n}.${ext}`;
      fs.mkdirSync(imgDir, { recursive: true });
      fs.writeFileSync(path.join(imgDir, name), buf);
      return { src: imgUrl + name };
    })
  });
  return r.value.match(/<(p|h[1-6]|ul|ol|table|blockquote)\b[^>]*>[\s\S]*?<\/\1>/g) || [];
}

// In-text citations "[3]" (optionally superscript) become links to reference 3.
const cite = (h) => h.replace(/(?:<sup>\s*)?\[(\d{1,3})\](?:\s*<\/sup>)?/g, (_, n) => `<sup class="cite"><a href="#ref-${n}">[${n}]</a></sup>`);

function shapeArticle(blocks, meta, lang) {
  // Drop the document's own title/byline/TL;DR header; the page renders those from meta.json.
  let tldr = meta.tldr && meta.tldr[lang], start = 0;
  const mi = blocks.slice(0, 14).findIndex((b) => HEAD_MARK.test(strip(b)));
  if (meta.bodyStart && meta.bodyStart[lang]) {
    start = Math.max(0, blocks.findIndex((b) => strip(b).startsWith(meta.bodyStart[lang])));
  } else if (mi >= 0) {
    if (!tldr) tldr = strip(blocks[mi + 1] || "");
    start = mi + 2;
  } else {
    while (start < blocks.length && /class="doc-(title|sub)"/.test(blocks[start])) start++;
  }
  const out = [], toc = [];
  let refs = null, n = 0, prev = "";
  for (const b of blocks.slice(start)) {
    const txt = strip(b);
    if (!txt && !/<img/.test(b)) continue;
    const tag = b.match(/^<(\w+)/)[1];
    // Word "Heading 1" = a section (numbered, in the contents panel); "Heading 2" and below = sub-heading.
    if (/^h[2-6]$/.test(tag) && !REF_HEAD.test(txt)) {
      if (refs) { out.push(`<ol class="refs">${refs.join("")}</ol>`); refs = null; }
      out.push(`<h3>${phrases(esc(txt))}</h3>`);
      prev = txt; continue;
    }
    if (/^h[1-6]$/.test(tag)) {
      if (refs) { out.push(`<ol class="refs">${refs.join("")}</ol>`); refs = null; }
      const id = REF_HEAD.test(txt) ? "references" : `s${++n}`;
      toc.push({ id, text: txt });
      out.push(`<h2 id="${id}">${headingHtml(esc(txt))}<a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a></h2>`);
      if (id === "references") refs = [];
      prev = txt; continue;
    }
    if (refs && tag === "p") {
      const inner = b.replace(/^<p[^>]*>|<\/p>$/g, "");
      const num = (inner.match(/^\s*\[?(\d+)\]?\s*[.、．]?\s*/) || [])[1];
      refs.push(`<li${num ? ` id="ref-${num}" value="${num}"` : ""}>${linkify(inner.replace(/^\s*\[\d+\]\s*|^\s*\d+\s*[.、．]\s*/, ""))}</li>`);
      continue;
    }
    if (tag === "blockquote") { out.push(cite(linkify(b))); prev = txt; continue; }
    let h = b;
    const inner = h.replace(/^<p[^>]*>|<\/p>$/g, "");
    if (tag === "p" && /^<em>[\s\S]*<\/em>$/.test(inner) && (/[:：]$/.test(prev) || /^[“"「『]/.test(txt))) {
      h = `<blockquote><p>${inner.replace(/^<em>|<\/em>$/g, "")}</p></blockquote>`;
    } else if (tag === "p" && /^<strong>[\s\S]*<\/strong>$/.test(inner)) {
      h = `<p class="pull">${inner.replace(/^<strong>|<\/strong>$/g, "")}</p>`;
    } else {
      h = linkify(h);
    }
    out.push(cite(h)); prev = txt;
  }
  if (refs) out.push(`<ol class="refs">${refs.join("")}</ol>`);
  const body = out.join("\n");
  return { body, toc, tldr: tldr || "", mins: readMinutes(strip(body), lang) };
}

/* Headline line breaks: wrap each clause in an inline-block span so a line can only break
   between clauses (after "," ":" or "，、：；？！"), never in the middle of a phrase. CSS
   text-wrap:balance then evens out the line lengths. Input is already-escaped text. */
function phrases(html) {
  if (!html) return html;
  const zh = /[㐀-鿿]/.test(html);
  const parts = zh ? html.split(/(?<=[，、：；？！])/) : html.split(/(?<=[,:;?!—])\s+/);
  return parts.length < 2 ? html : parts.map((p) => `<span class="ph">${p}</span>`).join(zh ? "" : " ");
}
/* Section heading: colour the leading number ("1." / "一、") and keep it with its first phrase. */
function headingHtml(html) {
  const m = html.match(/^(\d+[.．]|[一二三四五六七八九十百]+、)\s*/);
  if (!m) return phrases(html);
  const rest = phrases(html.slice(m[0].length));
  const num = `<span class="num">${m[1]}</span>`;
  return rest.startsWith('<span class="ph">') ? rest.replace('<span class="ph">', `<span class="ph">${num}`) : num + rest;
}

function readMinutes(text, lang) {
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const words = (text.replace(/[\u3400-\u9fff]/g, " ").match(/[A-Za-z0-9’'-]+/g) || []).length;
  return Math.max(1, Math.round(cjk / 400 + words / 230));
}

function hantFrom(hans) {
  return { ...hans, body: toHant(hans.body), tldr: toHant(hans.tldr), toc: hans.toc.map((t) => ({ ...t, text: toHant(t.text) })) };
}

async function loadArticles() {
  if (!fs.existsSync(SRC)) return [];
  const list = [];
  for (const dir of fs.readdirSync(SRC)) {
    const mp = path.join(SRC, dir, "meta.json");
    if (!fs.existsSync(mp)) { console.warn(`skip sources/${dir}: no meta.json`); continue; }
    const meta = JSON.parse(fs.readFileSync(mp, "utf8"));
    if (meta.draft) continue;
    const slug = meta.slug || dir;
    const imgDir = path.join(OUT, "articles", slug);
    const imgUrl = `${B}/articles/${slug}/`;
    const counter = { n: 0 };
    const L = {};
    for (const l of LANGS) {
      const f = meta.files && meta.files[l];
      if (!f) continue;
      const blocks = await docxToBlocks(path.join(SRC, dir, f), imgDir, imgUrl, counter);
      L[l] = shapeArticle(blocks, meta, l);
      L[l].title = esc((meta.title || {})[l] || "");
      L[l].sub = esc((meta.sub || {})[l] || "");
      L[l].kicker = esc((meta.kicker || {})[l] || "");
      L[l].tldr = esc(L[l].tldr);
    }
    if (!L.hant && L.hans) {
      L.hant = hantFrom(L.hans);
      for (const k of ["title", "sub", "kicker"]) L.hant[k] = (meta[k] && meta[k].hant) ? esc(meta[k].hant) : toHant(L.hans[k]);
      L.hant.auto = true;
    }
    for (const l of LANGS) {
      if (L[l]) continue;
      const from = FALLBACK[l].find((x) => L[x] && !L[x].fallbackFrom);
      if (from) L[l] = { ...L[from], fallbackFrom: from, auto: false };
    }
    if (!L.en) throw new Error(`sources/${dir}: needs at least one document in meta.files`);
    list.push({ slug, date: meta.date, topic: meta.topic, tags: meta.tags || [], featured: !!meta.featured, L });
    console.log(`  ✓ ${slug}  (${LANGS.map((l) => `${l}:${L[l].fallbackFrom ? "→" + L[l].fallbackFrom : L[l].auto ? "auto" : "docx"}`).join(" ")})`);
  }
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

/* ---------- page shell ---------- */
let ASSET_V = "";
const pick = (obj, l) => strip(obj[l] || obj.en || "");

function page({ titles, desc, pathname, active, main, head = "", bodyClass = "" }) {
  const nav = [["articles", "/articles/"], ["topics", "/topics/"], ["about", "/about/"]]
    .map(([k, href]) => `<a href="${B}${href}"${active === k ? ' aria-current="page"' : ""}>${tr("nav_" + k)}</a>`).join("");
  return `<!doctype html>
<html lang="en" data-theme="dark" data-lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>(function(){var d=document.documentElement,t,l;try{t=localStorage.getItem("ml-theme");l=localStorage.getItem("ml-lang")}catch(e){}
if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";
if(!/^(en|hans|hant)$/.test(l||"")){var n=(navigator.language||"en").toLowerCase();l=/^zh-(tw|hk|mo|hant)/.test(n)?"hant":n.indexOf("zh")===0?"hans":"en"}
d.setAttribute("data-theme",t);d.setAttribute("data-lang",l);d.lang={en:"en",hans:"zh-Hans",hant:"zh-Hant"}[l];d.className+=" js"})();</script>
<title>${esc(titles.en)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="color-scheme" content="dark light">
<link rel="canonical" href="${cfg.url}${B}${pathname}">
<meta property="og:site_name" content="markli.info">
<meta property="og:title" content="${esc(titles.en)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${cfg.url}${B}${pathname}">
${head}<link rel="icon" href="${B}/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="markli.info" href="${B}/rss.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;600;800&family=Noto+Sans+SC:wght@400;700&family=Noto+Sans+TC:wght@400;700&family=Noto+Serif+SC:wght@400;700&family=Noto+Serif+TC:wght@400;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,700;1,8..60,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${B}/assets/site.css?v=${ASSET_V}">
<script type="application/json" id="titles">${JSON.stringify(titles).replace(/</g, "\\u003c")}</script>
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
  <header class="top">
    <a class="prompt" href="${B}/"><b>${esc(cfg.prompt)}</b>:~$</a>
    <nav class="main">${nav}</nav>
    <div class="ctrls">
      <div class="seg" role="group" ${tips("theme_group")}>
        <button data-theme-set="light" ${tips("theme_light")} title="${esc(T.en.theme_light)}" aria-label="${esc(T.en.theme_light)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg></button>
        <button data-theme-set="dark" ${tips("theme_dark")} title="${esc(T.en.theme_dark)}" aria-label="${esc(T.en.theme_dark)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg></button>
      </div>
      <div class="seg" role="group" ${tips("lang_group")}><button data-lang="en" lang="en">EN</button><button data-lang="hans" lang="zh-Hans">简</button><button data-lang="hant" lang="zh-Hant">繁</button></div>
    </div>
  </header>
  <main id="main">
${main}
  </main>
  <footer class="bot">© ${cfg.year} ${tr("name")} · ${tr("updated")}: ${multi(Object.fromEntries(LANGS.map((l) => [l, fmtDate(today, l)])))} · <a href="${B}/rss.xml">${tr("subscribe")}</a> · <a href="mailto:${cfg.email}">${tr("email_me")}</a></footer>
</div>
<script src="${B}/assets/site.js?v=${ASSET_V}"></script>
</body>
</html>
`;
}

const titlesFor = (fn) => Object.fromEntries(LANGS.map((l) => [l, fn(l)]));
const dateML = (d) => multi(Object.fromEntries(LANGS.map((l) => [l, fmtDate(d, l)])));
const topicName = (t) => tr("topic_" + t);

function row(a) {
  return `<tr data-topic-row="${a.topic}"><td class="perm">-rw-r--r--</td><td class="date">${a.date}</td><td><a href="${B}/articles/${a.slug}/">${multi(Object.fromEntries(LANGS.map((l) => [l, a.L[l].title])))}</a><span class="t">#${topicName(a.topic)}</span></td><td class="perm">${multi(Object.fromEntries(LANGS.map((l) => [l, a.L[l].mins + "m"])))}</td></tr>`;
}
const table = (arts) => `<table class="ls">${arts.map(row).join("")}</table>`;

/* ---------- pages ---------- */
// Home-page name: English as a block-letter banner (Claude Code style), Chinese in large type.
function nameBanner() {
  const caret = `<span class="caret" aria-hidden="true"></span>`;
  return LANGS.map((l) => l === "en"
    ? `<span data-l="en" lang="en">${bannerSvg(esc(T.en.name))}</span>`
    : `<span data-l="${l}" lang="${HL[l]}">${esc(T[l].name)}${cursorSvg()}</span>`).join("");
}

function home(arts) {
  const f = arts.find((a) => a.featured) || arts[0];
  const feat = f ? `
    <section>
      <div class="cmd">cat <b>featured/latest.md</b></div>
      <article class="feat">
        <div class="bar"><span>${tr("featured")}</span><span>${dateML(f.date)}</span></div>
        <div class="body">
          <h2><a href="${B}/articles/${f.slug}/">${multi(Object.fromEntries(LANGS.map((l) => [l, f.L[l].title])))}</a></h2>
          <p class="sub">${multi(Object.fromEntries(LANGS.map((l) => [l, f.L[l].sub])))}</p>
          <p class="feat-sum">${multi(Object.fromEntries(LANGS.map((l) => [l, f.L[l].tldr])))}</p>
          <a class="btn" href="${B}/articles/${f.slug}/">[ ${tr("read")} → ]</a>
        </div>
      </article>
    </section>` : "";
  const main = `
    <div class="boot" aria-hidden="true"><span class="l">[ <span class="ok">OK</span> ] mounting /essays …</span><span class="l">[ <span class="ok">OK</span> ] loading locale: <span class="loc">en</span></span><span class="l">[ <span class="ok">OK</span> ] ${arts.length} ${arts.length === 1 ? "essay" : "essays"} indexed</span></div>
    <h1 class="name">${nameBanner()}</h1>
    ${feat}
    <section>
      <div class="cmd">ls -l <b>articles/</b> | head</div>
      ${table(arts.slice(0, 10))}
      <p class="note">// ${tr("coming")} <a href="${B}/articles/">${tr("all_articles")} →</a></p>
    </section>
    <section>
      <div class="cmd">whoami</div><div class="box whoami"><p>${tr("intro")}</p></div>
    </section>`;
  return page({ titles: titlesFor((l) => `${T[l].name} · markli.info`), desc: T.en.desc, pathname: "/", main });
}

function articlesPage(arts) {
  const years = [...new Set(arts.map((a) => a.date.slice(0, 4)))];
  const main = `
    <section>
      <div class="cmd">ls -l <b>articles/</b></div>
      <div class="chips"><button data-topic="">${tr("all_articles")}</button>${cfg.topics.map((t) => `<button data-topic="${t}">#${topicName(t)}</button>`).join("")}</div>
      ${years.map((y) => `<h2 class="year">${y}</h2>${table(arts.filter((a) => a.date.startsWith(y)))}`).join("\n")}
      <p class="note empty" hidden>└── ${tr("empty_topic")}</p>
      <p class="note">// ${tr("coming")}</p>
    </section>`;
  return page({ titles: titlesFor((l) => `${T[l].nav_articles} · markli.info`), desc: T.en.desc, pathname: "/articles/", active: "articles", main });
}

function topicsPage(arts) {
  const main = `
    <section>
      <div class="cmd">tree <b>topics/</b></div>
      ${cfg.topics.map((t) => {
        const list = arts.filter((a) => a.topic === t);
        return `<section id="${t}" style="margin:36px 0">
        <h2 class="topic-h">${topicName(t)}</h2>
        <p class="note">${tr(`topic_${t}_d`)} · ${tr("n_articles", list.length)}</p>
        ${list.length ? table(list) : `<p class="note">└── ${tr("empty_topic")}</p>`}
      </section>`;
      }).join("\n")}
    </section>`;
  return page({ titles: titlesFor((l) => `${T[l].nav_topics} · markli.info`), desc: T.en.desc, pathname: "/topics/", active: "topics", main });
}

function aboutPage() {
  // Intentionally empty for now: only the prompt and a blinking caret, until the About text is written.
  // Paragraphs added to `about_body` in i18n.js appear here automatically.
  const body = LANGS.some((l) => (T[l].about_body || []).length)
    ? `<div class="box">${LANGS.map((l) => `<div data-l="${l}" lang="${HL[l]}">${(T[l].about_body || []).map((p) => `<p>${esc(p)}</p>`).join("")}</div>`).join("")}</div>`
    : "";
  const main = `
    <section style="min-height:40vh">
      <div class="cmd">whoami<span class="caret" aria-hidden="true"></span></div>
      ${body}
    </section>`;
  return page({ titles: titlesFor((l) => `${T[l].about_title} · markli.info`), desc: T.en.desc, pathname: "/about/", active: "about", main });
}

function notFound() {
  const main = `
    <section>
      <div class="cmd">cd <b id="req">…</b></div>
      <h1 class="name" style="font-size:clamp(28px,5vw,48px)">${tr("nf_title")}</h1>
      <p class="tag">${tr("nf_body")}</p>
      <a class="btn" href="${B}/">[ ${tr("nf_home")} ]</a>
    </section>
    <script>document.getElementById("req").textContent=location.pathname</script>`;
  return page({ titles: titlesFor((l) => `404 · markli.info`), desc: T.en.desc, pathname: "/404.html", main });
}

function articlePage(a, i, arts) {
  const by = (k) => Object.fromEntries(LANGS.map((l) => [l, a.L[l][k]]));
  const phrased = (k) => Object.fromEntries(LANGS.map((l) => [l, phrases(a.L[l][k])]));
  const newer = arts[i - 1], older = arts[i + 1];
  const perLang = LANGS.map((l) => {
    const x = a.L[l];
    const notice = x.fallbackFrom
      ? `<p class="notice">${esc(T[l].only_in(T[l].lang_names[x.fallbackFrom]))}</p>`
      : x.auto ? `<p class="notice">${esc(T[l].auto_hant || "")}</p>` : "";
    const tl = x.tldr ? `<div class="post-tldr" lang="${HL[x.fallbackFrom || l]}"><span class="lbl">${esc(T[l].tldr)}</span><p>${x.tldr}</p></div>` : "";
    return `<div data-l="${l}" lang="${HL[x.fallbackFrom || l]}">${notice}${tl}<div class="prose post-body" lang="${HL[x.fallbackFrom || l]}">${scopeIds(x.body, l)}</div></div>`;
  }).join("\n");
  // Slide-out contents drawer, one list per language.
  const hasToc = LANGS.some((l) => a.L[l].toc.length > 2);
  const drawer = hasToc ? `
    <div class="rail">
    <button class="top-btn" type="button" ${tips("to_top")} title="${esc(T.en.to_top)}" aria-label="${esc(T.en.to_top)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h14M18 13l-6-6-6 6M12 7v14"/></svg></button>
    <button class="toc-btn" type="button" aria-controls="toc" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg><span>${tr("contents")}</span></button>
    <button class="bottom-btn" type="button" ${tips("to_bottom")} title="${esc(T.en.to_bottom)}" aria-label="${esc(T.en.to_bottom)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17V3M6 11l6 6 6-6M19 21H5"/></svg></button>
    </div>
    <div class="scrim" hidden></div>
    <aside id="toc" class="drawer" aria-label="${esc(T.en.contents)}" inert>
      <div class="dh"><h2 class="dh-title">${tr("toc_title")}</h2><button class="x" type="button" aria-label="Close">✕</button></div>
      ${LANGS.map((l) => `<ul data-l="${l}" lang="${HL[a.L[l].fallbackFrom || l]}">${a.L[l].toc.map((t) => `<li><a href="#${l}-${t.id}">${esc(t.text)}</a></li>`).join("")}</ul>`).join("")}
    </aside>` : "";
  const link = (b, cls, label) => b ? `<a class="${cls}" href="${B}/articles/${b.slug}/"><small>${tr(label)}</small>${multi(Object.fromEntries(LANGS.map((l) => [l, b.L[l].title])))}</a>` : "";
  const main = `
    <div class="progress" aria-hidden="true"></div>
    <article class="post">
      <header class="post-head">
        <p class="post-kicker"><a href="${B}/topics/#${a.topic}">${topicName(a.topic)}</a></p>
        <h1>${multi(phrased("title"))}</h1>
        ${a.L.en.sub ? `<p class="dek">${multi(phrased("sub"))}</p>` : ""}
        ${a.L.en.kicker ? `<p class="dek2">${multi(by("kicker"))}</p>` : ""}
      </header>
      <div class="byline"><span>${multi(Object.fromEntries(LANGS.map((l) => [l, l === "en" ? `By <b>${esc(T[l].name)}</b>` : `<b>${esc(T[l].name)}</b>`])))}</span><span>${dateML(a.date)}</span><span>${multi(Object.fromEntries(LANGS.map((l) => [l, `${a.L[l].mins} ${esc(T[l].min)}`])))}</span></div>
      ${perLang}
      <nav class="pn">${link(newer, "p", "next")}${link(older, "n", "prev")}</nav>
      <p class="back"><a href="${B}/articles/">← ${tr("back")}</a></p>
    </article>
    ${drawer}`;
  const desc = pick(by("tldr"), "en").slice(0, 200);
  const head = `<meta property="og:type" content="article">\n<meta property="article:published_time" content="${a.date}">\n`;
  return page({ titles: titlesFor((l) => `${strip(a.L[l].title)} · ${T[l].name}`), desc, pathname: `/articles/${a.slug}/`, active: "articles", main, head, bodyClass: "reading" });
}

// Each language copy of an article gets its own anchor ids (en-s1, hans-s1, …).
function scopeIds(html, l) {
  return html.replace(/ id="(s\d+|references|ref-\d+)"/g, ` id="${l}-$1"`).replace(/ href="#(s\d+|references|ref-\d+)"/g, ` href="#${l}-$1"`);
}

function rss(arts) {
  const items = arts.map((a) => `    <item>
      <title>${esc(strip(a.L.en.title))}</title>
      <link>${cfg.url}${B}/articles/${a.slug}/</link>
      <guid isPermaLink="true">${cfg.url}${B}/articles/${a.slug}/</guid>
      <pubDate>${new Date(a.date + "T12:00:00Z").toUTCString()}</pubDate>
      <category>${esc(T.en["topic_" + a.topic])}</category>
      <description>${esc(strip(a.L.en.tldr))}</description>
    </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Mark Li · markli.info</title>
    <link>${cfg.url}${B}/</link>
    <atom:link href="${cfg.url}${B}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>${esc(T.en.desc)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

function sitemap(arts) {
  const urls = ["/", "/articles/", "/topics/", "/about/", ...arts.map((a) => `/articles/${a.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${cfg.url}${B}${u}</loc></url>`).join("\n")}
</urlset>
`;
}

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#06101c"/><path d="M14 20l12 12-12 12" fill="none" stroke="#4db2ff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><rect x="31" y="40" width="20" height="6" rx="2" fill="#67d8f0"/></svg>`;

/* ---------- write ---------- */
// Empty docs/ before a build. Folders that Windows holds open (Explorer, an editor, a shell) are left in place.
function clean(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { clean(p); try { fs.rmdirSync(p); } catch (err) { /* busy: keep the empty folder */ } }
    else fs.unlinkSync(p);
  }
}
function write(rel, content) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

(async () => {
  console.log("building markli.info → docs/");
  clean(OUT);
  fs.mkdirSync(OUT, { recursive: true });
  const css = fs.readFileSync(path.join(__dirname, "assets", "site.css"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "assets", "site.js"), "utf8");
  ASSET_V = crypto.createHash("sha1").update(css + js).digest("hex").slice(0, 8);
  write("assets/site.css", css);
  write("assets/site.js", js);
  write("favicon.svg", FAVICON);
  write(".nojekyll", "");
  if (cfg.cname) write("CNAME", cfg.cname + "\n");

  const arts = await loadArticles();
  write("index.html", home(arts));
  write("articles/index.html", articlesPage(arts));
  write("topics/index.html", topicsPage(arts));
  write("about/index.html", aboutPage());
  write("404.html", notFound());
  arts.forEach((a, i) => write(`articles/${a.slug}/index.html`, articlePage(a, i, arts)));
  write("rss.xml", rss(arts));
  write("sitemap.xml", sitemap(arts));
  write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${cfg.url}${B}/sitemap.xml\n`);
  console.log(`done: ${arts.length} article(s), last updated ${today}`);
})().catch((e) => { console.error(e); process.exit(1); });
