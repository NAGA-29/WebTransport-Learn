// Step07: Multiplexing - 1 セッション内で複数ルームを扱う。
//
// 設計意図:
//   - 「ルーム = サーバ側の Set<session>」で管理し、発言はそのルーム内だけに broadcast
//   - クライアント→サーバ: 制御 (join/leave) + 本文 を 1 本の bidirectional control stream で多重化
//   - サーバ→クライアント: ルーム専用の unidirectional stream を開いて broadcast
//   - 複数ルーム同時参加時も stream が独立しているため HoL blocking しない

import { startServer } from '../shared/server/bootstrap.js';
import { createFrameDecoder, encodeFrame } from '../shared/protocol/framing.js';

/** @type {Map<string, Set<any>>} */
const rooms = new Map();

function joinRoom(room, session) {
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room).add(session);
}
function leaveRoom(room, session) {
  rooms.get(room)?.delete(session);
  if (rooms.get(room)?.size === 0) rooms.delete(room);
}
function broadcast(room, msg) {
  const payload = encodeFrame(new TextEncoder().encode(JSON.stringify(msg)));
  for (const s of rooms.get(room) ?? []) {
    s.roomWriters?.get(room)?.write(payload).catch(() => {});
  }
}

await startServer({
  port: 4433,
  pathPattern: '/step07',
  onSession: async (session) => {
    session.roomWriters = new Map();
    session.joined = new Set();
    session.closed.finally(() => {
      for (const room of session.joined) leaveRoom(room, session);
    });

    // 制御チャネル: 最初の bidirectional stream を制御用とする
    const incoming = session.incomingBidirectionalStreams.getReader();
    const { value: ctrl, done } = await incoming.read();
    if (done || !ctrl) return; // session closed before control stream was opened
    handleControl(session, ctrl).catch((e) => console.log('ctrl err', e.message));
  },
});

async function handleControl(session, stream) {
  const r = stream.readable.getReader();
  const decoder = createFrameDecoder();
  while (true) {
    const { value, done } = await r.read();
    if (done) break;
    for (const frame of decoder.push(value)) {
      const cmd = JSON.parse(new TextDecoder().decode(frame));
      await handleCommand(session, cmd);
    }
  }
  for (const room of session.joined) leaveRoom(room, session);
}

async function handleCommand(session, cmd) {
  if (cmd.op === 'join') {
    const room = String(cmd.room);
    if (session.joined.has(room)) return;
    joinRoom(room, session);
    session.joined.add(room);

    // このルーム専用の unidirectional stream を開く (broadcast 用)
    const out = await session.createUnidirectionalStream();
    const w = out.getWriter();
    // 1 フレーム目にルーム名を送ってクライアント側が紐付けられるようにする
    await w.write(encodeFrame(new TextEncoder().encode(JSON.stringify({ type: 'hello', room }))));
    session.roomWriters.set(room, w);
    console.log(`  [${cmd.user}] joined ${room}`);
    broadcast(room, { type: 'system', room, body: `${cmd.user} joined` });
  } else if (cmd.op === 'leave') {
    const room = String(cmd.room);
    if (!session.joined.has(room)) return;
    broadcast(room, { type: 'system', room, body: `${cmd.user} left` });
    session.joined.delete(room);
    leaveRoom(room, session);
    session.roomWriters.get(room)?.close().catch(() => {});
    session.roomWriters.delete(room);
    console.log(`  [${cmd.user}] left ${room}`);
  } else if (cmd.op === 'say') {
    broadcast(String(cmd.room), { type: 'chat', room: cmd.room, user: cmd.user, body: cmd.body });
  }
}
