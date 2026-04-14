// step06 メッセージ定義 (pure、トランスポート非依存、Rust に移植可能な粒度)。
//
// 2 種のメッセージを 2 種のチャネルに振り分ける:
//   - ChatMessage  → Bidirectional Stream (信頼 / 順序)
//   - TypingEvent  → Datagram            (低遅延 / 失ってよい)
//
// どちらも JSON 文字列で表現 (学習容易性優先。本番は CBOR / Protobuf 推奨)。

/**
 * @typedef {{ type: 'chat', user: string, body: string, ts: number }} ChatMessage
 * @typedef {{ type: 'typing', user: string, ts: number }} TypingEvent
 */

/** @param {ChatMessage} m */
export function encodeChat(m) {
  return new TextEncoder().encode(JSON.stringify(m));
}

/** @param {Uint8Array} buf @returns {ChatMessage} */
export function decodeChat(buf) {
  const m = JSON.parse(new TextDecoder().decode(buf));
  if (
    m === null || typeof m !== 'object' || Array.isArray(m) ||
    m.type !== 'chat' ||
    typeof m.user !== 'string' ||
    typeof m.body !== 'string' ||
    typeof m.ts !== 'number'
  ) {
    throw new TypeError(`Invalid ChatMessage: ${JSON.stringify(m)}`);
  }
  return m;
}

/** @param {TypingEvent} e */
export function encodeTyping(e) {
  return new TextEncoder().encode(JSON.stringify(e));
}

/** @param {Uint8Array} buf @returns {TypingEvent} */
export function decodeTyping(buf) {
  const e = JSON.parse(new TextDecoder().decode(buf));
  if (
    e === null || typeof e !== 'object' || Array.isArray(e) ||
    e.type !== 'typing' ||
    typeof e.user !== 'string' ||
    typeof e.ts !== 'number'
  ) {
    throw new TypeError(`Invalid TypingEvent: ${JSON.stringify(e)}`);
  }
  return e;
}
