# Rust 移行スケルトン

このディレクトリは **ビルド対象ではありません**。Node.js で学んだ構造を Rust の `wtransport` crate に移行するための設計雛形です。

## 提案スタック

| 層 | Node 実装 | Rust 実装 |
|----|-----------|-----------|
| トランスポート | `@fails-components/webtransport` | `wtransport` (0.6+) |
| ランタイム | Node イベントループ | `tokio` (multi-thread) |
| フレーミング | `shared/protocol/framing.js` | `bytes::BytesMut` + 手書き parser |
| 信頼プロトコル | `step08/protocol/reliable.js` | 同ロジックを state struct で |
| JSON | 標準 | `serde_json` |

## ステップ

1. `cargo new wtransport-edge` で新規 crate を作成
2. `Cargo.toml.example` を `Cargo.toml` にリネームして依存を追加
3. 証明書は Node 版と同じ `certs/cert.pem` / `key.pem` を読む
4. `bootstrap.js` の役割を `src/main.rs` に写経:
   - `Endpoint::server(...)` で listen
   - `accept().await` のループ
   - セッションごとに `tokio::spawn`
5. 各 step の `onSession` 相当のハンドラを `async fn` として移植
6. プロトコル層は **トランスポートに触らず** `Vec<u8>` / `&[u8]` だけで書く

## 参考

- https://docs.rs/wtransport
- https://github.com/BiagioFesta/wtransport
