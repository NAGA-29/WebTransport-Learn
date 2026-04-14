// Length-prefixed メッセージフレーミング (トランスポート非依存・pure)。
//
// WebTransport の Stream は **バイト列の連続** を渡してくるだけで、
// "1 メッセージがどこで切れるか" は自分で決める必要がある。
// ここでは「4 バイトの大端 uint32 で payload 長を書き、続けて payload」という
// シンプルな TLV スタイルを採用する。
//
// 設計意図:
//   - WebSocket のようにメッセージ境界をトランスポートに頼らない
//   - JSON や ProtoBuf など中身に依存させず、バイト列として扱う
//   - Rust (tokio + bytes) へ移植する際も同じ 1 対 1 のロジックで書ける
//
// 将来 Rust に移す際は、本ファイルの encode/decode と対応する
// struct Framer { buf: BytesMut } を wtransport の RecvStream に被せるだけでよい。

const HEADER_BYTES = 4;

/** 受け入れる最大フレームサイズ (1 MiB)。これを超えるとデコーダがエラーを投げる。 */
export const MAX_FRAME_SIZE = 1 * 1024 * 1024; // 1 MiB

/**
 * payload (Uint8Array) を length-prefixed なフレームへ変換する。
 * @param {Uint8Array} payload
 * @returns {Uint8Array}
 */
export function encodeFrame(payload) {
  if (!(payload instanceof Uint8Array)) {
    throw new TypeError('payload must be Uint8Array');
  }
  const frame = new Uint8Array(HEADER_BYTES + payload.byteLength);
  const view = new DataView(frame.buffer);
  view.setUint32(0, payload.byteLength, false); // big-endian
  frame.set(payload, HEADER_BYTES);
  return frame;
}

/**
 * ストリーミング入力から完全なフレームを取り出すデコーダ。
 * 断片的な chunk を順に push し、取り出せるフレームを都度返す。
 *
 * @param {{ maxFrameSize?: number }} [opts]
 *   maxFrameSize – 1フレームのペイロード上限バイト数 (デフォルト MAX_FRAME_SIZE = 1 MiB)。
 *   超過時は RangeError を throw する。
 *
 * 使い方:
 *   const decoder = createFrameDecoder();
 *   for await (const chunk of readable) {
 *     for (const frame of decoder.push(chunk)) {
 *       handle(frame);
 *     }
 *   }
 */
export function createFrameDecoder({ maxFrameSize = MAX_FRAME_SIZE } = {}) {
  /** @type {Uint8Array} */
  let buffer = new Uint8Array(0);

  function append(chunk) {
    const next = new Uint8Array(buffer.byteLength + chunk.byteLength);
    next.set(buffer, 0);
    next.set(chunk, buffer.byteLength);
    buffer = next;
  }

  function tryExtract() {
    const frames = [];
    while (buffer.byteLength >= HEADER_BYTES) {
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const len = view.getUint32(0, false);
      if (len > maxFrameSize) {
        throw new RangeError(
          `Frame size ${len} exceeds maximum allowed frame size (${maxFrameSize}).`
        );
      }
      if (buffer.byteLength < HEADER_BYTES + len) break;
      const payload = buffer.slice(HEADER_BYTES, HEADER_BYTES + len);
      frames.push(payload);
      buffer = buffer.slice(HEADER_BYTES + len);
    }
    return frames;
  }

  return {
    /** @param {Uint8Array} chunk */
    push(chunk) {
      append(chunk);
      return tryExtract();
    },
    get buffered() {
      return buffer.byteLength;
    },
  };
}

/** 文字列を UTF-8 フレームへ. */
export function encodeText(str) {
  return encodeFrame(new TextEncoder().encode(str));
}

/** フレームを UTF-8 文字列へ. */
export function decodeText(frame) {
  return new TextDecoder().decode(frame);
}
