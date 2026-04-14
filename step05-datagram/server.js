// Step05: Datagram で位置情報エコー。
//
// Datagram の特徴:
//   - 順序保証なし、再送なし (失うことを許容)
//   - 1 datagram = 1 パケットに収まる (QUIC MTU - overhead ≈ 1200 bytes 目安)
//   - Stream のようなフロー制御・ヘッドオブライン blocking がない
//
// 使いどころ: 位置情報, 入力, 音声/映像のフレーム, "最新値が正義" 系のイベント

import { startServer } from '../shared/server/bootstrap.js';

await startServer({
  port: 4433,
  pathPattern: '/step05',
  onSession: async (session) => {
    const reader = session.datagrams.readable.getReader();
    const writer = session.datagrams.writable.getWriter();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        console.log('  ← dgram ' + text);
        // そのまま echo (位置情報を他のクライアントへ中継する段階はまだやらない)
        await writer.write(new TextEncoder().encode('ack:' + text));
      }
    } catch (e) {
      console.log('  datagram loop error:', e.message);
    }
  },
});
