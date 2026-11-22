const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(process.argv[2] || path.join(__dirname, "..", "docs")), port = +process.argv[3] || 4173;
const T = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".webp": "image/webp" };
http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  fs.readFile(p, (e, d) => {
    if (e) { const nf = path.join(root, "404.html"); res.writeHead(404, { "Content-Type": T[".html"] }); return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : "404"); }
    res.writeHead(200, { "Content-Type": T[path.extname(p)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(d);
  });
}).listen(port, () => console.log("serving " + root + " on " + port));
