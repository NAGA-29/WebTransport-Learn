# Step 04 — Bidirectional Stream

## 🎯 ゴール

- `createBidirectionalStream()` / `incomingBidirectionalStreams` を使い、双方向の request/response を実装する
- **1 リクエスト = 1 stream** パターンを理解する

## なぜこの設計か

WebSocket では request を送ったあと「どの応答が自分のか」を**アプリ層で ID 管理**する必要がありました。
WebTransport の **Bidirectional Stream** は 1 本の独立したチャネルで、stream ライフサイクルに「今の往復」を乗せられます:

```
client                 server
  │  createBidirStream   │
  ├─────────────────────▶│
  │   "hello"            │
  ├─────────────────────▶│
  │   FIN (half-close)   │
  ├─────────────────────▶│
  │                      │ 処理
  │   "HELLO"            │
  │◀─────────────────────┤
  │   FIN                │
  │◀─────────────────────┤
```

このパターンは HTTP/2 / gRPC の単発 call と同じ発想で、**並列度は stream 数まで自然に伸ばせる**のが強みです。

## 実行手順

```bash
cd step04-bidirectional-stream
npm install
npm start
# 別ターミナル
npm run serve-client
# Chrome → http://localhost:8080/  hash を入れて Connect
```

メッセージを入力して **Send** を押すたびに新しい stream が生まれ、サーバが大文字化して返します。

## 確認ポイント

- サーバ側ログ `← hello` → クライアント側 `← HELLO`
- 連打すると複数 stream が並列で往復（Network タブで確認可能）

## 次へ

[Step 05 — Datagram](../step05-datagram/) で「信頼性を捨てて低遅延を取る」モードを学びます。
