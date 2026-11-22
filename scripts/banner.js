// Block-letter banner in the "ANSI Shadow" figlet style used by the Claude Code splash screen.
// Drawn as SVG on an exact character grid (not as text), so the columns never drift: web fonts
// often lack the █ and ╔═╗ glyphs and the browser substitutes another font with other widths.
const GLYPHS = {
  M: ["███╗   ███╗", "████╗ ████║", "██╔████╔██║", "██║╚██╔╝██║", "██║ ╚═╝ ██║", "╚═╝     ╚═╝"],
  A: [" █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
  R: ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██║  ██║", "╚═╝  ╚═╝"],
  K: ["██╗  ██╗", "██║ ██╔╝", "█████╔╝ ", "██╔═██╗ ", "██║  ██╗", "╚═╝  ╚═╝"],
  L: ["██╗     ", "██║     ", "██║     ", "██║     ", "███████╗", "╚══════╝"],
  I: ["██╗", "██║", "██║", "██║", "██║", "╚═╝"],
  C: [" ██████╗", "██╔════╝", "██║     ", "██║     ", "╚██████╗", " ╚═════╝"],
  U: ["██╗   ██╗", "██║   ██║", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
  D: ["██████╗ ", "██╔══██╗", "██║  ██║", "██║  ██║", "██████╔╝", "╚═════╝ "],
  E: ["███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "███████╗", "╚══════╝"],
  O: [" ██████╗ ", "██╔═══██╗", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
  " ": ["  ", "  ", "  ", "  ", "  ", "  "]
};

/** The banner as 6 lines of text (useful for checking the letter shapes in a terminal). */
function banner(text) {
  const rows = ["", "", "", "", "", ""];
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch];
    if (!g) throw new Error(`banner: no glyph for "${ch}"`);
    const w = Math.max(...g.map((r) => [...r].length));
    g.forEach((r, i) => { rows[i] += r + " ".repeat(w - [...r].length); });
  }
  return rows.map((r) => r.replace(/\s+$/, ""));
}

/* Geometry, matching the Claude Code splash:
   - one terminal cell is a brick 2 tall x 1 wide
   - horizontally, solid cells join edge to edge with only a thin grid line between them
   - vertically, every text row is separated from the next by a dark separator line */
const CW = 10, CH = 20, SEP = 1.6, D = 1.5; // D: half the gap between the two strokes of a double line

// Double-line box characters as polylines inside one cell (cx, cy = cell centre).
// Each entry lists the outer and inner stroke; together they form the "shadow" outline.
function boxPaths(ch, x, y) {
  const L = x, R = x + CW, T = y, Bt = y + CH, cx = x + CW / 2, cy = y + CH / 2;
  const P = (pts) => "M" + pts.map((p) => p.map((n) => +n.toFixed(2)).join(" ")).join("L");
  switch (ch) {
    case "═": return [P([[L, cy - D], [R, cy - D]]), P([[L, cy + D], [R, cy + D]])];
    case "║": return [P([[cx - D, T], [cx - D, Bt]]), P([[cx + D, T], [cx + D, Bt]])];
    case "╗": return [P([[L, cy - D], [cx + D, cy - D], [cx + D, Bt]]), P([[L, cy + D], [cx - D, cy + D], [cx - D, Bt]])];
    case "╔": return [P([[R, cy - D], [cx - D, cy - D], [cx - D, Bt]]), P([[R, cy + D], [cx + D, cy + D], [cx + D, Bt]])];
    case "╝": return [P([[L, cy + D], [cx + D, cy + D], [cx + D, T]]), P([[L, cy - D], [cx - D, cy - D], [cx - D, T]])];
    case "╚": return [P([[R, cy + D], [cx - D, cy + D], [cx - D, T]]), P([[R, cy - D], [cx + D, cy - D], [cx + D, T]])];
    default: return [];
  }
}

// The blinking cursor: one solid rectangle, 6 bricks wide (3 "squares") and 5 rows tall,
// with no grid lines, separators or shadow.
const CUR_COLS = 6, CUR_ROWS = 5;
const cursorRect = (c0) => `<rect class="blink" x="${c0 * CW}" y="${SEP / 2}" width="${CUR_COLS * CW}" height="${CUR_ROWS * CH - SEP}" fill="currentColor"/>`;

// Cells of a block of text rows, offset by `c0` columns: runs of solid bricks plus shadow strokes.
function layout(rows, c0 = 0) {
  const runs = [], paths = [];
  rows.forEach((row, r) => {
    [...row].forEach((ch, i) => {
      const c = c0 + i;
      if (ch === "█") {
        const last = runs[runs.length - 1];
        if (last && last.r === r && last.c + last.n === c) last.n++;
        else runs.push({ r, c, n: 1 });
      } else paths.push(...boxPaths(ch, c * CW, r * CH));
    });
  });
  return { runs, paths };
}

const f = (n) => +n.toFixed(2);
// a run of solid cells in one row: one bar, inset top and bottom by half the row separator
const bar = ({ r, c, n }) => `<rect x="${c * CW}" y="${f(r * CH + SEP / 2)}" width="${n * CW}" height="${f(CH - SEP)}"/>`;
// grid lines inside a bar: a vertical line at every cell boundary (each cell is a 2-tall x 1-wide brick)
const grid = ({ r, c, n }) => {
  const y0 = r * CH + SEP / 2, y1 = (r + 1) * CH - SEP / 2;
  let d = "";
  for (let k = 1; k < n; k++) d += `M${(c + k) * CW} ${f(y0)}V${f(y1)}`;
  return d;
};
const draw = ({ runs, paths }) =>
  `<g fill="currentColor">${runs.map(bar).join("")}</g>`
  + `<path class="grid" fill="none" d="${runs.map(grid).join("")}"/>`
  + `<path fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" d="${paths.join("")}"/>`;

/** The banner as an inline SVG using currentColor, with a blinking cursor after it. */
function bannerSvg(text, { cursor = true } = {}) {
  const rows = banner(text);
  const cols = Math.max(...rows.map((r) => [...r].length));
  const curC = cols + 2, W = (cursor ? curC + CUR_COLS : cols) * CW, H = rows.length * CH;
  return `<svg class="banner" viewBox="0 0 ${W} ${H}" role="img" aria-label="${text}" xmlns="http://www.w3.org/2000/svg">`
    + draw(layout(rows))
    + (cursor ? cursorRect(curC) : "")
    + `</svg>`;
}

/** Just the cursor (same proportions), for use after the Chinese name. */
function cursorSvg() {
  return `<svg class="caret-svg" viewBox="0 0 ${CUR_COLS * CW} ${CUR_ROWS * CH}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${cursorRect(0)}</svg>`;
}

module.exports = { banner, bannerSvg, cursorSvg };

if (require.main === module) console.log(banner(process.argv[2] || "MARK LI").join("\n"));
