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
  return JSON.parse(new TextDecoder().decode(buf));
}

/** @param {TypingEvent} e */
export function encodeTyping(e) {
  return new TextEncoder().encode(JSON.stringify(e));
}

/** @param {Uint8Array} buf @returns {TypingEvent} */
export function decodeTyping(buf) {
  return JSON.parse(new TextDecoder().decode(buf));
}
