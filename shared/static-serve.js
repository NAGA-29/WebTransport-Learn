#!/usr/bin/env node
// 各 step の client.html をブラウザで開くための最小の HTTP 静的サーバ。
//
// なぜ必要？
//   Chrome は WebTransport を file:// オリジンから呼ぶことを許可しない
//   ことがあるため、http://localhost:<port>/ 経由で HTML を配る。
//   SharedArrayBuffer 等は使わないので COOP/COEP は不要。
//
// 使い方: node ../shared/static-serve.js . [port]

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const port = Number(process.argv[3] ?? 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const relativeUrlPath = urlPath.replace(/^[/\\]+/, '');
    let filePath = path.normalize(path.join(root, relativeUrlPath));
    const relativePath = path.relative(root, filePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'client.html');
    }
    if (!fs.existsSync(filePath)) {
      res.writeHead(404).end('not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});

server.listen(port, () => {
  console.log(`📂 static server: http://localhost:${port}/  (root=${root})`);
});
