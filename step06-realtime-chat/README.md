# Step 06 — Realtime Chat (Stream vs Datagram)

## 🎯 ゴール

- 1 つのアプリで Stream と Datagram を **使い分け** られるようになる
- 「確実に届いて欲しい」「遅くても残したい」は Stream、「失っても良い」「最新値が正義」は Datagram という判断軸を持てる

## なぜこの設計か

| チャネル | 用途 | 理由 |
|---------|------|------|
| **Bidirectional Stream** (クライアント→サーバ) | チャット本文送信 | 失ってはいけない / 順序重要 |
| **Unidirectional Stream** (サーバ→クライアント) | 参加者全員へ本文配信 | 信頼 broadcast を省コストで |
| **Datagram** (双方向) | typing indicator | 失っても良い / 低頻度イベント / 低遅延 |

これを WebSocket で作ると全部 1 本の信頼 channel に載せることになり、**重要なチャット本文が typing イベントの列で待たされる** ような HoL blocking が発生します。WebTransport なら自然に分離できます。

## 実行手順

```bash
cd step06-realtime-chat
npm install
npm start
# 別ターミナル
npm run serve-client
# Chrome タブを 2 つ開き、ユーザー名を変えて Connect
# どちらかで文字を打つと もう片方に "typing..." が届く
# Enter 送信で両方に本文が届く
```

## 確認ポイント

- タブ A で入力中 → タブ B に `user1 typing...` が滲み出てくる
- Enter 送信 → タブ A / B の両方に `user1: hello` が確定表示
- サーバ側ログで `[chat]` 行と datagram 受信量を比較

## 学び

- **プロトコル層の分離** (`protocol/message.js`) が効いている。トランスポートが Node であろうが Rust であろうが、同じ `ChatMessage` / `TypingEvent` 定義を使い回せる。

## 次へ

[Step 07 — Multiplexing](../step07-multiplexing/) で、同じサーバで多数のルームを並列に扱います。
