// Step09: 計測対象の echo サーバ。bidi stream で受けた payload を即返す。
// 計測で邪魔にならないようログは最小化する。

import { startServer } from '../shared/server/bootstrap.js';
import { createFrameDecoder, encodeFrame } from '../shared/protocol/framing.js';

let openSessions = 0;
setInterval(() => console.log(`  sessions=${openSessions}`), 2000);

await startServer({
  port: 4433,
  pathPattern: '/step09',
  onSession: async (session) => {
    openSessions++;
    session.closed.finally(() => openSessions--);

    const reader = session.incomingBidirectionalStreams.getReader();
    while (true) {
      const { value: stream, done } = await reader.read();
      if (done) break;
      echo(stream).catch(() => {});
    }
  },
});

async function echo(stream) {
  const r = stream.readable.getReader();
  const w = stream.writable.getWriter();
  const decoder = createFrameDecoder();
  while (true) {
    const { value, done } = await r.read();
    if (done) break;
    for (const frame of decoder.push(value)) {
      await w.write(encodeFrame(frame));
    }
  }
  await w.close();
}
