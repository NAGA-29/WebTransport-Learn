// Step08: Datagram + 自前 ACK/再送 を使って "信頼ある低遅延配送" を学ぶ。
// サーバは受信した payload をそのまま echo する (信頼受信側 → 信頼送信側)。

import { startServer } from '../shared/server/bootstrap.js';
import { createReliableReceiver, createReliableSender, parsePacket, TAG_ACK, TAG_DATA } from './protocol/reliable.js';

await startServer({
  port: 4433,
  pathPattern: '/step08',
  onSession: async (session) => {
    const writer = session.datagrams.writable.getWriter();

    const sender = createReliableSender({
      send: (buf) => writer.write(buf),
      onGaveUp: (seq) => console.log(`  [server] gave up seq=${seq}`),
    });
    const recv = createReliableReceiver({
      send: (buf) => writer.write(buf),
      onDeliver: (payload, seq) => {
        const text = new TextDecoder().decode(payload);
        console.log(`  [server] deliver #${seq}: ${text}`);
        sender.send(new TextEncoder().encode('echo:' + text));
      },
    });

    const tick = setInterval(() => sender.tick(), 100);
    session.closed.finally(() => clearInterval(tick));

    const r = session.datagrams.readable.getReader();
    while (true) {
      const { value, done } = await r.read();
      if (done) break;
      // ACK 処理は sender 側、DATA 処理は receiver 側
      const p = parsePacket(value);
      if (!p) continue;
      if (p.tag === TAG_ACK) sender.onAck(p.seq);
      else if (p.tag === TAG_DATA) await recv.onPacket(value);
    }
  },
});
