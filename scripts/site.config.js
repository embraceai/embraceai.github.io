// Site-wide settings. Change `url` / `base` once the GitHub Pages address is final.
module.exports = {
  // Absolute address used in RSS, sitemap and share links.
  url: "https://www.markli.info",
  // Path prefix if the site lives under a sub-path (e.g. "/blog" for username.github.io/blog). "" for a root domain.
  base: "",
  // Custom domain for GitHub Pages. When set, the build writes docs/CNAME. Leave "" to use username.github.io.
  cname: "www.markli.info",
  prompt: "world@markli.info",
  year: 2026,
  // Traditional Chinese is generated from Simplified with OpenCC. "tw" converts characters only;
  // "twp" also swaps Mainland vocabulary for Taiwan usage (软件 -> 軟體); "hk" uses Hong Kong forms.
  openccTarget: "tw",
  topics: ["tech", "education", "parenting"]
};
