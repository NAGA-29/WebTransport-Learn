#!/usr/bin/env node
// Node 側ヘッドレス WebTransport ベンチマーク。
//
// 使い方:
//   node bench-client.js --sessions 50 --per-session 200 --payload 256
//
// 測定項目:
//   - 接続成功率
//   - 各往復 RTT (P50 / P95 / P99)
//   - 総スループット

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFrameDecoder, encodeFrame } from '../shared/protocol/framing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERT_HASH_FILE = path.resolve(__dirname, '..', 'certs', 'cert.sha256.b64');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : def;
}

const SESSIONS = Number(arg('sessions', 10));
const PER_SESSION = Number(arg('per-session', 100));
const PAYLOAD = Number(arg('payload', 128));
const URL = arg('url', 'https://localhost:4433/step09');

if (!fs.existsSync(CERT_HASH_FILE)) {
  console.error('cert hash 不在。先に bash shared/cert/generate-cert.sh を実行してください。');
  process.exit(1);
}
const certHashB64 = fs.readFileSync(CERT_HASH_FILE, 'utf8').trim();
const certHash = Buffer.from(certHashB64, 'base64');

const { WebTransport } = await import('@fails-components/webtransport');

const payload = new Uint8Array(PAYLOAD);
for (let i = 0; i < PAYLOAD; i++) payload[i] = i & 0xff;

async function oneSession(id) {
  const wt = new WebTransport(URL, {
    serverCertificateHashes: [{ algorithm: 'sha-256', value: certHash }],
  });
  try {
    await wt.ready;
  } catch (e) {
    return { id, connected: false, rtts: [] };
  }
  const rtts = [];
  for (let i = 0; i < PER_SESSION; i++) {
    const stream = await wt.createBidirectionalStream();
    const w = stream.writable.getWriter();
    const r = stream.readable.getReader();
    const t0 = performance.now();
    await w.write(encodeFrame(payload));
    await w.close();
    const decoder = createFrameDecoder();
    let got = false;
    while (!got) {
      const { value, done } = await r.read();
      if (done) break;
      for (const _ of decoder.push(value)) { got = true; break; }
    }
    rtts.push(performance.now() - t0);
  }
  try { wt.close(); } catch {}
  return { id, connected: true, rtts };
}

function percentile(arr, p) {
  if (!arr.length) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

console.log(`▶ sessions=${SESSIONS} per=${PER_SESSION} payload=${PAYLOAD}B url=${URL}`);
const t0 = Date.now();
const results = await Promise.all(Array.from({ length: SESSIONS }, (_, i) => oneSession(i)));
const elapsed = (Date.now() - t0) / 1000;

const connected = results.filter((r) => r.connected).length;
const rtts = results.flatMap((r) => r.rtts);
const totalReqs = rtts.length;

console.log('--- result ---');
console.log(`connect success : ${connected}/${SESSIONS}`);
console.log(`total requests  : ${totalReqs}`);
console.log(`elapsed         : ${elapsed.toFixed(2)}s`);
console.log(`throughput      : ${(totalReqs / elapsed).toFixed(1)} req/s`);
console.log(`rtt P50         : ${percentile(rtts, 0.5).toFixed(2)} ms`);
console.log(`rtt P95         : ${percentile(rtts, 0.95).toFixed(2)} ms`);
console.log(`rtt P99         : ${percentile(rtts, 0.99).toFixed(2)} ms`);
console.log(`rtt max         : ${Math.max(...rtts).toFixed(2)} ms`);

process.exit(0);
