// Step06: Stream (chat本文) と Datagram (typing indicator) を 1 つのサーバで共存。
//
// 設計意図:
//   - "今打ってる" のような落ちて良いイベントは Datagram で全員へ broadcast
//   - 確定したチャット本文は Bidirectional Stream で receive → broadcast
//   - どちらも同じ session に同居し、互いに邪魔をしない (HoL なし)

import { startServer } from '../shared/server/bootstrap.js';
import { createFrameDecoder, encodeFrame } from '../shared/protocol/framing.js';
import { decodeChat, encodeChat } from './protocol/message.js';

const sessions = new Set();

function broadcastChat(msg) {
  const payload = encodeFrame(encodeChat(msg));
  for (const s of sessions) {
    s.broadcastStreamWriter?.write(payload).catch(() => {});
  }
}

function broadcastTyping(buf, except) {
  for (const s of sessions) {
    if (s === except) continue;
    s.datagramWriter?.write(buf).catch(() => {});
  }
}

await startServer({
  port: 4433,
  pathPattern: '/step06',
  onSession: async (session) => {
    sessions.add(session);
    session.closed.finally(() => sessions.delete(session));

    // broadcast 用の 1 本の unidirectional stream を最初に開く
    const broadcast = await session.createUnidirectionalStream();
    session.broadcastStreamWriter = broadcast.getWriter();

    // datagram 送信口
    session.datagramWriter = session.datagrams.writable.getWriter();

    // typing (datagram) receive loop
    (async () => {
      const r = session.datagrams.readable.getReader();
      while (true) {
        const { value, done } = await r.read();
        if (done) break;
        broadcastTyping(value, session);
      }
    })().catch(() => {});

    // chat (bidi stream) receive loop
    const incoming = session.incomingBidirectionalStreams.getReader();
    while (true) {
      const { value: stream, done } = await incoming.read();
      if (done) break;
      handleChatStream(stream).catch((e) => console.log('chat err', e.message));
    }
  },
});

async function handleChatStream(stream) {
  const r = stream.readable.getReader();
  const decoder = createFrameDecoder();
  while (true) {
    const { value, done } = await r.read();
    if (done) break;
    for (const frame of decoder.push(value)) {
      const msg = decodeChat(frame);
      console.log(`  [chat] ${msg.user}: ${msg.body}`);
      broadcastChat(msg);
    }
  }
  // 送信側 FIN。応答は broadcast stream 経由なのでここでは write しない。
}
