// Datagram の上に最小の "信頼配送" を載せるためのプロトコル層 (pure)。
//
// 設計:
//   送信側は (seq, payload) の DATA datagram を送り、ACK (seq) が返るまで
//   一定周期で再送する。受信側は DATA を受け取ったら seq を返し、
//   既に配達済みの seq は無視 (重複排除)。
//
// パケット形式 (1 byte tag + 4 byte seq (BE) + payload):
//   DATA = 0x01, seq, payload
//   ACK  = 0x02, seq
//
// トランスポート非依存にするため send/recv のコールバックを受け取る。
// 本モジュールは Rust に 1:1 で書き直せる粒度で setInterval / setTimeout も外部化。

export const TAG_DATA = 0x01;
export const TAG_ACK = 0x02;

export function encodeData(seq, payload) {
  const out = new Uint8Array(1 + 4 + payload.byteLength);
  out[0] = TAG_DATA;
  new DataView(out.buffer).setUint32(1, seq >>> 0, false);
  out.set(payload, 5);
  return out;
}

export function encodeAck(seq) {
  const out = new Uint8Array(5);
  out[0] = TAG_ACK;
  new DataView(out.buffer).setUint32(1, seq >>> 0, false);
  return out;
}

export function parsePacket(buf) {
  if (buf.byteLength < 5) return null;
  const tag = buf[0];
  const seq = new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint32(1, false);
  if (tag === TAG_DATA) return { tag, seq, payload: buf.slice(5) };
  if (tag === TAG_ACK) return { tag, seq };
  return null;
}

/**
 * 送信側の状態機械。未 ACK の送信を管理し、一定間隔で再送する。
 *
 * @param {{
 *   send: (buf: Uint8Array) => void | Promise<void>,
 *   retryMs?: number,
 *   maxAttempts?: number,
 *   onGaveUp?: (seq: number) => void,
 *   now?: () => number,
 * }} cfg
 */
export function createReliableSender(cfg) {
  const retryMs = cfg.retryMs ?? 250;
  const maxAttempts = cfg.maxAttempts ?? 8;
  const now = cfg.now ?? Date.now;
  let nextSeq = 1;
  /** @type {Map<number, { payload: Uint8Array, sentAt: number, attempts: number }>} */
  const pending = new Map();

  async function send(payload) {
    const seq = nextSeq++;
    pending.set(seq, { payload, sentAt: now(), attempts: 1 });
    await cfg.send(encodeData(seq, payload));
    return seq;
  }

  function onAck(seq) {
    pending.delete(seq);
  }

  async function tick() {
    const cutoff = now() - retryMs;
    for (const [seq, rec] of pending) {
      if (rec.sentAt > cutoff) continue;
      if (rec.attempts >= maxAttempts) {
        pending.delete(seq);
        cfg.onGaveUp?.(seq);
        continue;
      }
      rec.attempts++;
      rec.sentAt = now();
      try { await cfg.send(encodeData(seq, rec.payload)); } catch { /* ignore */ }
    }
  }

  return { send, onAck, tick, pendingCount: () => pending.size };
}

/**
 * 受信側: 重複排除 + ACK 送信。
 *
 * @param {{
 *   send: (buf: Uint8Array) => void | Promise<void>,
 *   onDeliver: (payload: Uint8Array, seq: number) => void,
 *   windowSize?: number,
 * }} cfg
 */
export function createReliableReceiver(cfg) {
  const windowSize = cfg.windowSize ?? 4096;
  const seen = new Set();
  // Ring buffer for O(1) eviction instead of array + shift() which is O(n).
  const ring = new Array(windowSize);
  let head = 0;   // index of the oldest slot
  let count = 0;  // number of entries currently stored

  async function onPacket(buf) {
    const p = parsePacket(buf);
    if (!p || p.tag !== TAG_DATA) return;
    await cfg.send(encodeAck(p.seq));
    if (seen.has(p.seq)) return;
    seen.add(p.seq);
    if (count === windowSize) {
      // Window is full: evict the oldest entry in O(1).
      seen.delete(ring[head]);
      ring[head] = p.seq;
      head = (head + 1) % windowSize;
    } else {
      ring[(head + count) % windowSize] = p.seq;
      count++;
    }
    cfg.onDeliver(p.payload, p.seq);
  }

  return { onPacket };
}
