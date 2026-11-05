import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist",
);
const types = {
  ".html": "text/html;charset=utf-8",
  ".js": "text/javascript;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".json": "application/json",
  ".map": "application/json",
};
try {
  await stat(path.join(root, "index.html"));
} catch {
  console.error("Execute npm ci e npm run build para gerar dist/.");
  process.exit(1);
}
const server = createServer(async (req, res) => {
  try {
    let requested = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (requested === "/") requested = "/index.html";
    let file = path.resolve(root, "." + requested);
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      await stat(file);
    } catch {
      file = path.join(root, "index.html");
    }
    res.setHeader(
      "Content-Type",
      types[path.extname(file)] ?? "application/octet-stream",
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(await readFile(file));
  } catch {
    res.writeHead(400);
    res.end("Requisicao invalida");
  }
});
server.on("error", (e) => {
  console.error("Nao foi possivel abrir a porta 1420:", e.message);
  process.exit(1);
});
server.listen(1420, "127.0.0.1", () =>
  console.log("MolasStruct: http://127.0.0.1:1420\nCtrl+C para encerrar."),
);
