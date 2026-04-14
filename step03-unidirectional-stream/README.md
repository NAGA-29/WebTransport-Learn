# Step 03 — Unidirectional Stream

## 🎯 ゴール

- サーバからクライアントへの**片方向 Stream** を体験する
- Stream ベース通信における **信頼 + 順序保証** の感触を掴む
- 「なぜ WebSocket ではなく Unidirectional か」を説明できる

## なぜこの設計か

WebSocket は双方向 1 本の bytes 列なので、サーバ発信専用のイベントでも「実質使っていない受信チャネル」のリソースを持ってしまいます。
WebTransport の **Unidirectional Stream** は、サーバ→クライアントの用途専用で、相手側に不要な writer 半面を作らせません。これは:

- 株価 tick / ゲームの状態 broadcast / 通知 push
- 同時に何十本でも開ける（QUIC は stream id が軽量）

といったケースで素直に表現できます。

本 step では **1 tick = 1 stream** という割り切った設計にしています。長い 1 本を維持する方法もありますが、境界が明確で学習しやすく、各 tick の到達時刻もブラウザの DevTools で観察しやすいです。

## 実行手順

```bash
bash shared/cert/generate-cert.sh        # 未実施なら
cd step03-unidirectional-stream
npm install
npm start                                # 別ターミナル
npm run serve-client                     # 別ターミナル
# Chrome で http://localhost:8080/ を開き、hash を入れて Connect
```

## 確認ポイント

- 毎秒 `← {"seq":N,"ts":...}` がブラウザ側ログに追記される
- DevTools → Network で QUIC stream が増減しているのが見える（chrome://net-export/ でも可）

## 注意点

- `session.createUnidirectionalStream()` は**サーバ発信**の stream を開く。逆向きは `session.createBidirectionalStream()` や、クライアント側 `wt.createUnidirectionalStream()` を使う。
- Framing を自前でやることに違和感があるかもしれないが、Stream は bytes 列なので **アプリ層でメッセージ境界を決める** 必要がある。`shared/protocol/framing.js` の length-prefixed が最小例。

## 次へ

[Step 04 — Bidirectional Stream](../step04-bidirectional-stream/) で request/response を学びます。
