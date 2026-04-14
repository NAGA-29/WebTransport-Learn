// Step03: サーバ → クライアントの片方向 Stream。
// 1 秒おきに tick メッセージを UnidirectionalStream で push する。
//
// なぜ UnidirectionalStream か:
//   - サーバが一方的に通知を流したいだけでクライアントから応答不要なユースケース
//     (ダッシュボード配信、相場 tick、ログ tail など)
//   - Bidirectional にすると受信側の write 半分が無駄に開き、フロー制御も増える

import { startServer } from '../shared/server/bootstrap.js';
import { encodeText } from '../shared/protocol/framing.js';

await startServer({
  port: 4433,
  pathPattern: '/step03',
  onSession: async (session) => {
    console.log('  → ticker start');
    let seq = 0;
    const interval = setInterval(async () => {
      try {
        // 毎 tick 新しい stream を 1 本開き、書き切って閉じる。
        // (長い stream を 1 本維持するより境界が明確で学びやすい)
        const stream = await session.createUnidirectionalStream();
        const w = stream.getWriter();
        await w.write(encodeText(JSON.stringify({ seq: seq++, ts: Date.now() })));
        await w.close();
      } catch (e) {
        console.log('  stream error:', e.message);
        clearInterval(interval);
      }
    }, 1000);

    try { await session.closed; } catch {}
    clearInterval(interval);
    console.log('  ← ticker stop');
  },
});
