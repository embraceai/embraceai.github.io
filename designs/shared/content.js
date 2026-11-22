/* Shared trilingual content + language switcher for all design concepts.
   Usage in a page:
     <span data-i18n="tagline"></span>            -> text from STRINGS
     <span data-a="0" data-f="title"></span>      -> field of ARTICLES[0]
   Language buttons: <button data-lang="en|hans|hant">
   Rendering hooks: window.onLang = (lang) => { ... } is called after each switch. */
(function () {
  const STRINGS = {
    en: {
      name: "Mark Li", brand: "markli.info",
      tagline: "Notes on frontier technology, education and parenting.",
      intro: "This is my personal site, where I keep the essays I've written over the years: on frontier technology, on how we educate, and on raising children in a world that is changing fast.",
      nav_home: "Home", nav_articles: "Articles", nav_topics: "Topics", nav_about: "About", nav_archive: "Archive",
      latest: "Latest", featured: "Featured essay", all_articles: "All articles", read: "Read essay", tldr: "TL;DR",
      topics: "Topics", about: "About", min: "min read", sample: "sample", now: "Now",
      now_text: "Thinking about AI-assisted mathematics, the future of PhD training, and what education should prepare people for.",
      subscribe: "Follow via RSS", footer: "Written by a human. Typeset with care. Hosted on GitHub Pages.",
      t_ai: "AI & the Future", t_math: "Mathematics", t_edu: "Education", t_tech: "Frontier Tech", t_parent: "Parenting", updated: "Last updated", theme_light: "Light mode", theme_dark: "Dark mode", t_essay: "Essays",
      stat_articles: "articles", stat_years: "years writing", stat_langs: "languages",
      search: "Search articles…", coming: "More essays are being migrated from the archive."
    },
    hans: {
      name: "李曦", brand: "markli.info",
      tagline: "关于前沿科技、教育与育儿的思考。",
      intro: "这是我的个人网站，收录了我多年来写下的文章：关于前沿科技，关于教育，也关于在一个快速变化的世界里如何养育孩子。",
      nav_home: "首页", nav_articles: "文章", nav_topics: "主题", nav_about: "关于", nav_archive: "归档",
      latest: "最新", featured: "精选文章", all_articles: "全部文章", read: "阅读全文", tldr: "核心观点",
      topics: "主题", about: "关于", min: "分钟阅读", sample: "示例", now: "近况",
      now_text: "正在思考 AI 辅助数学研究、博士培养的未来，以及教育究竟应该让人准备什么。",
      subscribe: "RSS 订阅", footer: "由人类写作，用心排版，托管于 GitHub Pages。",
      t_ai: "AI 与未来", t_math: "数学", t_edu: "教育", t_tech: "前沿科技", t_parent: "育儿", updated: "最后更新", theme_light: "浅色模式", theme_dark: "深色模式", t_essay: "随笔",
      stat_articles: "篇文章", stat_years: "年写作", stat_langs: "种语言",
      search: "搜索文章…", coming: "更多文章正在从旧档案迁移中。"
    },
    hant: {
      name: "李曦", brand: "markli.info",
      tagline: "關於前沿科技、教育與育兒的思考。",
      intro: "這是我的個人網站，收錄了我多年來寫下的文章：關於前沿科技，關於教育，也關於在一個快速變化的世界裡如何養育孩子。",
      nav_home: "首頁", nav_articles: "文章", nav_topics: "主題", nav_about: "關於", nav_archive: "歸檔",
      latest: "最新", featured: "精選文章", all_articles: "全部文章", read: "閱讀全文", tldr: "核心觀點",
      topics: "主題", about: "關於", min: "分鐘閱讀", sample: "示例", now: "近況",
      now_text: "正在思考 AI 輔助數學研究、博士培養的未來，以及教育究竟應該讓人準備什麼。",
      subscribe: "RSS 訂閱", footer: "由人類寫作，用心排版，託管於 GitHub Pages。",
      t_ai: "AI 與未來", t_math: "數學", t_edu: "教育", t_tech: "前沿科技", t_parent: "育兒", updated: "最後更新", theme_light: "淺色模式", theme_dark: "深色模式", t_essay: "隨筆",
      stat_articles: "篇文章", stat_years: "年寫作", stat_langs: "種語言",
      search: "搜尋文章…", coming: "更多文章正在從舊檔案遷移中。"
    }
  };

  // ARTICLES[0] is real. The rest are clearly-marked SAMPLE slots so layouts can be judged with a full list.
  const ARTICLES = [
    {
      real: true, date: "2026-11-21", mins: 22, topic: "t_tech", tags: ["AI", "Mathematics", "Education"],
      slug: "when-the-riemann-hypothesis-was-proved",
      title: {
        en: "When the Riemann Hypothesis Was Proved",
        hans: "当黎曼猜想被证明",
        hant: "當黎曼猜想被證明"
      },
      sub: {
        en: "An Age in Which Even the Greatest Experts Underestimate AI",
        hans: "一个连顶级专家都低估了 AI 的时代",
        hant: "一個連頂級專家都低估了 AI 的時代"
      },
      kicker: {
        en: "From a historic breakthrough in mathematics to the future of research, education, and ordinary people",
        hans: "从数学界的历史性突破，到科研、教育与普通人的未来",
        hant: "從數學界的歷史性突破，到科研、教育與普通人的未來"
      },
      tldr: {
        en: "In November 2026, Levent Alpöge and Claude produced a formal proof of the Riemann Hypothesis, verified by the Lean and Mathlib communities, just 36 days after Terence Tao speculated a breakthrough might come around 2050. Even leading experts underestimate AI. If the most powerful models stay concentrated in a few institutions, research, PhD training, universities and ordinary people's work may all be reshaped.",
        hans: "2026 年 11 月，数学家 Levent Alpöge 与 Claude 合作提出黎曼猜想的形式化证明，并获得 Lean/Mathlib 社区验证；距陶哲轩谈及 AI 可能到 2050 年才能攻克黎曼猜想，仅过去 36 天。顶尖专家也可能低估 AI。当最强模型与资源集中在少数机构，科研机会、博士培养、大学定位及普通人的职业价值都将面临重塑。",
        hant: "2026 年 11 月，數學家 Levent Alpöge 與 Claude 合作提出黎曼猜想的形式化證明，並獲得 Lean/Mathlib 社群驗證；距陶哲軒談及 AI 可能到 2050 年才能攻克黎曼猜想，僅過去 36 天。頂尖專家也可能低估 AI。當最強模型與資源集中在少數機構，科研機會、博士培養、大學定位及普通人的職業價值都將面臨重塑。"
      },
      facts: [
        { n: "167", en: "years unsolved", hans: "年悬而未决", hant: "年懸而未決" },
        { n: "36", en: "days after the “2050” estimate", hans: "天，距“2050”预测", hant: "天，距「2050」預測" },
        { n: "17M", en: "lines of Lean", hans: "行 Lean 代码", hant: "行 Lean 程式碼" },
        { n: "4", en: "layers of verification", hans: "层验证", hant: "層驗證" }
      ]
    },
    { date: "2025-06-12", mins: 14, topic: "t_edu", tags: ["Education"],
      title: { en: "Sample slot: an essay on education", hans: "示例位：一篇关于教育的文章", hant: "示例位：一篇關於教育的文章" },
      sub: { en: "Placeholder until your archive is converted", hans: "旧文章转换后将替换此处", hant: "舊文章轉換後將替換此處" } },
    { date: "2024-09-03", mins: 11, topic: "t_tech", tags: ["Technology"],
      title: { en: "Sample slot: a technology essay", hans: "示例位：一篇科技文章", hant: "示例位：一篇科技文章" },
      sub: { en: "Placeholder until your archive is converted", hans: "旧文章转换后将替换此处", hant: "舊文章轉換後將替換此處" } },
    { date: "2023-03-18", mins: 9, topic: "t_parent", tags: ["Parenting"],
      title: { en: "Sample slot: an essay on parenting", hans: "示例位：一篇关于育儿的文章", hant: "示例位：一篇關於育兒的文章" },
      sub: { en: "Placeholder until your archive is converted", hans: "旧文章转换后将替换此处", hant: "舊文章轉換後將替換此處" } },
    { date: "2021-11-27", mins: 17, topic: "t_essay", tags: ["Essay"],
      title: { en: "Sample slot: a personal essay", hans: "示例位：一篇随笔", hant: "示例位：一篇隨筆" },
      sub: { en: "Placeholder until your archive is converted", hans: "旧文章转换后将替换此处", hant: "舊文章轉換後將替換此處" } }
  ];
  ARTICLES.forEach(a => { if (!a.tldr) a.tldr = a.sub; if (!a.kicker) a.kicker = a.sub; });

  const UPDATED = "2026-11-21"; // set to the latest publish date at build time
  const LANGS = { en: "en", hans: "zh-Hans", hant: "zh-Hant" };
  let lang = "en";
  try { lang = localStorage.getItem("ml-lang") || ""; } catch (e) {}
  if (!LANGS[lang]) {
    const n = (navigator.language || "en").toLowerCase();
    lang = /zh-(tw|hk|mo|hant)/.test(n) ? "hant" : n.startsWith("zh") ? "hans" : "en";
  }

  function t(key) { return (STRINGS[lang] || STRINGS.en)[key] || key; }
  function af(i, f) { const v = ARTICLES[i][f]; return v && typeof v === "object" ? v[lang] : v; }

  function apply() {
    document.documentElement.lang = LANGS[lang];
    document.documentElement.dataset.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll("[data-a]").forEach(el => { el.textContent = af(+el.dataset.a, el.dataset.f); });
    document.querySelectorAll("[data-lang]").forEach(b => b.classList.toggle("on", b.dataset.lang === lang));
    if (typeof window.onLang === "function") window.onLang(lang);
  }

  function setLang(l) { lang = l; try { localStorage.setItem("ml-lang", l); } catch (e) {} apply(); }

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-lang]");
    if (b) { e.preventDefault(); setLang(b.dataset.lang); }
  });

  window.ML = { STRINGS, ARTICLES, UPDATED, t, af, setLang, get lang() { return lang; }, apply,
    fmtDate(d) { const [y, m, dd] = d.split("-"); return lang === "en"
      ? new Date(d + "T00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : `${y}年${+m}月${+dd}日`; } };
  document.addEventListener("DOMContentLoaded", apply);
})();
