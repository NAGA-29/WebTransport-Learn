// Step02: 最小の WebTransport サーバ。
// 接続を受けて "hello" ログを出し、すぐに切断せず待機するだけ。

import { startServer } from '../shared/server/bootstrap.js';

await startServer({
  port: 4433,
  pathPattern: '/step02',
  onSession: async (session) => {
    console.log('  → hello! session established');
    // 何もせずセッションを保持する。クライアント側切断まで待つ。
    try {
      await session.closed;
    } catch { /* ignore */ }
  },
});
