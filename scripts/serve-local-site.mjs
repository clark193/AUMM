import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";
const root = fileURLToPath(new URL("../out/", import.meta.url));
const port = Number(process.env.PORT || 3000);
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".ttf": "font/ttf", ".ico": "image/x-icon" };
const server = createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let file = resolve(root, "." + pathname);
    if (file !== resolve(root) && !file.startsWith(resolve(root) + sep)) { response.writeHead(403).end(); return; }
    if (statSync(file).isDirectory()) file = resolve(file, "index.html");
    response.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    createReadStream(file).pipe(response);
  } catch { response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Página não encontrada"); }
});
server.listen(port, "0.0.0.0", () => {
  console.log(`Site compilado: http://127.0.0.1:${port}`);
  for (const interfaces of Object.values(networkInterfaces())) for (const address of interfaces || []) {
    if (address.family === "IPv4" && !address.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address.address)) console.log(`Rede local: http://${address.address}:${port}`);
  }
});
