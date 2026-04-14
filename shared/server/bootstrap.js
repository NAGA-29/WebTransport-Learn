// サーバ起動の共通ブートストラップ。
// 各 step の server.js はこのモジュールを使って Http3Server を起動する。
//
// 分離理由:
//   - 証明書パスや port の取り回しは各 step で共通
//   - トランスポート固有のコード (@fails-components/webtransport 呼び出し)
//     をここに集約し、各 step の server.js では「session を受けて何をするか」
//     というプロトコル層のロジックだけに集中できる
//   - 将来 Rust 実装へ乗せ換える際も、差し替えるのはこのファイルだけで済む

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CERT_DIR = path.join(REPO_ROOT, 'certs');

/**
 * @typedef {Object} BootstrapOptions
 * @property {number} [port=4433]
 * @property {string} [host='0.0.0.0']
 * @property {string} pathPattern   - '/stepXX' 等。session.path と照合する。
 * @property {(session: any) => Promise<void> | void} onSession - accept 後に呼ばれる
 */

/**
 * 共通の Http3Server を起動する。
 * @param {BootstrapOptions} opts
 */
export async function startServer(opts) {
  const { port = 4433, host = '0.0.0.0', pathPattern, onSession } = opts;

  // 証明書ロード
  const certPath = path.join(CERT_DIR, 'cert.pem');
  const keyPath = path.join(CERT_DIR, 'key.pem');
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.error('❌ 証明書が見つかりません。以下を先に実行してください:');
    console.error('     bash shared/cert/generate-cert.sh');
    process.exit(1);
  }
  const cert = fs.readFileSync(certPath);
  const privKey = fs.readFileSync(keyPath);

  // @fails-components/webtransport は Rust/quiche を wrap したバイナリ依存がある。
  // 環境によっては動的 import が失敗するため、親切なエラーを出す。
  let Http3Server;
  try {
    ({ Http3Server } = await import('@fails-components/webtransport'));
  } catch (err) {
    console.error('❌ @fails-components/webtransport のロードに失敗しました。');
    console.error('   このステップのディレクトリで `npm install` を実行してください。');
    console.error('   詳細:', err.message);
    process.exit(1);
  }

  const server = new Http3Server({
    port,
    host,
    secret: 'webtransport-learn-dev-secret',
    cert,
    privKey,
  });

  server.startServer();
  await server.ready;
  console.log(`🚀 HTTP/3 (WebTransport) server listening on https://${host}:${port}${pathPattern}`);

  // session 受付ループ
  const stream = server.sessionStream(pathPattern);
  const reader = stream.getReader();
  while (true) {
    const { value: session, done } = await reader.read();
    if (done) break;
    session.ready
      .then(() => {
        console.log(`🔗 session accepted: ${pathPattern}`);
        return onSession(session);
      })
      .catch((err) => console.error('session handler error:', err));
    session.closed
      .then(() => console.log(`👋 session closed: ${pathPattern}`))
      .catch(() => {});
  }
}
