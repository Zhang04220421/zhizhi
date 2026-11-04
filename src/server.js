import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
  ["/src/app.js", ["src/app.js", "text/javascript; charset=utf-8"]],
  ["/src/game.js", ["src/game.js", "text/javascript; charset=utf-8"]],
]);
const port = Number(process.env.PORT) || 3000;

createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const file = files.get(pathname);
  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("页面不存在");
    return;
  }
  try {
    const content = await readFile(path.join(root, file[0]));
    response.writeHead(200, { "content-type": file[1] });
    response.end(content);
  } catch {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("服务器读取文件失败");
  }
}).listen(port, () => {
  console.log(`2048 已启动：http://localhost:${port}`);
});
