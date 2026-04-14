#!/usr/bin/env node
// HTTP/3 が有効かを簡易的に確認するスクリプト。
//
// 戦略:
//  1) HTTPS で HEAD リクエストを送り Alt-Svc / alt-svc ヘッダを確認する
//     (サーバが HTTP/3 に対応しているなら h3=":443" 等を告知する)
//  2) curl --http3 が使える環境なら追加検証で実プロトコルを測定する
//
// 学習ポイント:
//  ブラウザも Node.js も、最初の TCP+HTTPS リクエストで Alt-Svc を受けて
//  次回以降の接続から QUIC (HTTP/3) に切り替えるという 2 段階方式が主流。

import { spawn } from 'node:child_process';

const target = process.argv[2] ?? 'https://cloudflare-quic.com';
const url = new URL(target);

async function probeAltSvc() {
  console.log(`\n[1] HEAD ${url} — Alt-Svc を確認`);
  const res = await fetch(url, { method: 'HEAD' });
  const altSvc = res.headers.get('alt-svc');
  if (altSvc) {
    console.log(`    ✅ Alt-Svc: ${altSvc}`);
    const advertisesH3 = /\bh3(?:-\d+)?=/.test(altSvc);
    console.log(`    ${advertisesH3 ? '✅' : '❌'} HTTP/3 (h3) を告知: ${advertisesH3}`);
  } else {
    console.log('    ❌ Alt-Svc ヘッダなし — このサーバは HTTP/3 を告知していません');
  }
}

function probeCurlH3() {
  return new Promise((resolve) => {
    console.log('\n[2] curl --http3 で実接続を試行');
    const proc = spawn('curl', ['--http3', '-sI', '--max-time', '8', url.toString()]);
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => (out += d));
    proc.stderr.on('data', (d) => (err += d));
    proc.on('error', () => {
      console.log('    ⚠️  curl が見つかりません (スキップ)');
      resolve();
    });
    proc.on('close', (code) => {
      if (code !== 0) {
        console.log('    ⚠️  curl が HTTP/3 非対応ビルド or 接続失敗 (スキップ):');
        console.log('       ', (err || '').split('\n')[0]);
      } else {
        const status = out.split('\n')[0]?.trim();
        console.log(`    ✅ HTTP/3 で応答取得: ${status}`);
      }
      resolve();
    });
  });
}

(async () => {
  try {
    await probeAltSvc();
  } catch (e) {
    console.log(`    ❌ HEAD 失敗: ${e.message}`);
  }
  await probeCurlH3();
  console.log('\n完了。次は step02 で自前の WebTransport サーバを立てます。\n');
})();
