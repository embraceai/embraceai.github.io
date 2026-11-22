# markli.info

Personal site of Mark Li (李曦): essays on frontier technology, education and parenting, in English, Simplified Chinese and Traditional Chinese.

The site is plain static HTML generated from the original Word documents and served by GitHub Pages from the `docs/` folder.

```
sources/<slug>/        original .docx files + meta.json   (not published)
scripts/build.js       converts sources/ into docs/
scripts/i18n.js        interface text in EN / 简 / 繁
scripts/site.config.js site address, custom domain, topics
scripts/assets/        site.css, site.js (copied into docs/assets)
docs/                  the generated site (this is what GitHub Pages serves)
designs/               the 10 design concepts from round 1 (not published)
```

## Build and preview

```powershell
npm install
npm run build
npm run serve
```

Then open http://localhost:4173.

## Adding an article

1. Make a folder `sources/<slug>/`, for example `sources/why-kids-should-learn-to-code/`.
2. Copy in the Word documents (one per language you have).
3. Add `meta.json`:

```json
{
  "slug": "why-kids-should-learn-to-code",
  "date": "2027-01-15",
  "topic": "parenting",
  "tags": ["Education"],
  "featured": true,
  "files": { "en": "english.docx", "hans": "chinese.docx" },
  "title":  { "en": "…", "hans": "…" },
  "sub":    { "en": "…", "hans": "…" },
  "kicker": { "en": "…", "hans": "…" }
}
```

- `topic` is one of `tech`, `education`, `parenting` (add more in `site.config.js` and `i18n.js`).
- Traditional Chinese is generated from the Simplified document with OpenCC. To supply your own, add `"hant": "file.docx"` to `files`.
- A language with no document shows another version with a notice.
- If the document starts with a title, byline and a `TL;DR` / `核心观点` paragraph, the build uses that paragraph as the summary and drops the header (the page renders the title from `meta.json`). Otherwise give `"tldr": {…}` and, if needed, `"bodyStart": { "en": "first words of the body" }`.
- PDF sources: convert to .docx first (Word can open a PDF), or ask Claude to convert it.
- HTML sources also work (`"en": "article.en.html"`), e.g. articles copied from Medium: `<h1>` is a section, `<h2>` a sub-heading, and images with a relative `src` (such as `images/fig-1.webp`) are copied into the site. Add `"originalUrl"` to show "Originally published on …", and `"translatedFrom": "en"` to label the other languages as translations.
- `"draft": true` keeps an article out of the build.
- `"replace": { "hans": [["wrong text", "corrected text"]] }` corrects the generated page without editing the Word file (繁 follows 简). The build warns if the text is no longer found.
- `"promote": [{ "pattern": "^\\d+\\.\\s", "level": 2 }]` turns short paragraphs that act as headings into real headings (level 1 = section, 2 = sub-heading). A bold heading that shares a paragraph with its text through a line break is split first.
- `"notes": ["…"]` is ignored by the build; use it to record why an article needs `promote` or `replace`.

Then run `npm run build`, check it with `npm run serve`, and commit `sources/` and `docs/`.

## Publishing on GitHub Pages

1. Create a repository on GitHub (for example `markli.info`) and push this folder to it.
2. In the repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/docs`.
3. The site appears at `https://<username>.github.io/<repo>/`. For that address set `base: "/<repo>"` and `url: "https://<username>.github.io"` in `scripts/site.config.js` and rebuild. For a repository named `<username>.github.io`, leave `base` empty.

### Custom domain (markli.info)

1. Set `cname: "markli.info"`, `url: "https://markli.info"` and `base: ""` in `scripts/site.config.js`, rebuild and push (this writes `docs/CNAME`).
2. At your DNS provider, point the apex domain to GitHub Pages with four `A` records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`. Add a `CNAME` record for `www` pointing to `<username>.github.io`.
3. In **Settings → Pages**, enter `markli.info` as the custom domain and tick **Enforce HTTPS** once the certificate is issued.
