// Step04: Bidirectional Stream で簡易エコーチャット。
// クライアントが作った stream の bytes を受けて大文字化して返す。
//
// 設計意図:
//   - request/response 型の操作は Bidirectional Stream が自然
//   - 1 リクエスト 1 stream にすると、応答待ちの状態を stream のライフサイクルに乗せられる
//   - 長時間の "1 本の双方向チャネル" にしないことで、フロー制御やキャンセルが単純になる

import { startServer } from '../shared/server/bootstrap.js';
import { createFrameDecoder, decodeText, encodeText } from '../shared/protocol/framing.js';

await startServer({
  port: 4433,
  pathPattern: '/step04',
  onSession: async (session) => {
    const reader = session.incomingBidirectionalStreams.getReader();
    while (true) {
      const { value: stream, done } = await reader.read();
      if (done) break;
      handle(stream).catch((e) => console.log('handle error:', e.message));
    }
  },
});

async function handle(stream) {
  const r = stream.readable.getReader();
  const w = stream.writable.getWriter();
  const decoder = createFrameDecoder();
  while (true) {
    const { value, done } = await r.read();
    if (done) break;
    for (const frame of decoder.push(value)) {
      const text = decodeText(frame);
      console.log('  ← ' + text);
      await w.write(encodeText(text.toUpperCase()));
    }
  }
  await w.close();
}
