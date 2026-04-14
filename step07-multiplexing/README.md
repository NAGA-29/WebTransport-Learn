# Step 07 — Multiplexing (ルーム機能)

## 🎯 ゴール

- 1 つの WebTransport session 内で **複数の論理チャネル (ルーム)** を扱う
- 「制御 stream」 と 「ルーム専用 broadcast stream」 の分離パターンを習得する
- HoL blocking がルーム間で起きない利点を実感する

## なぜこの設計か

WebSocket で複数ルームを実装するとき、典型的には 1 本の bytes 列にルーム ID を埋め込んで多重化しますが、**1 ルームの大きな書き込みが他ルームの受信を遅延させる** 可能性があります。

WebTransport では以下のように **ルームごとに独立した QUIC stream** を使うことで、互いに干渉しない多重化ができます。

```
client ─┬─ bidi control stream ─→ server (join/leave/say)
        ├─ uni stream "general" ←── server broadcast
        ├─ uni stream "random"  ←── server broadcast
        └─ uni stream "dev"     ←── server broadcast
```

制御だけを 1 本の bidirectional に集め、受信は room 単位で独立させることで、**送信元/配信先のスケールを別方向に伸ばせる** 構成になります (step10 で再論)。

## 実行手順

```bash
cd step07-multiplexing
npm install
npm start
# 別ターミナル
npm run serve-client
# Chrome で http://localhost:8080/ を開く
# Connect → general / random など複数 Join して動作確認
# 2 タブで名前を変えて同時 Join すると互いに会話できる
```

## 確認ポイント

- サーバ側ログに `[user1] joined general`
- 1 つのルームに大きなメッセージを流しても、他ルームの tick は止まらない
- Leave すると stream が閉じる

## 次へ

[Step 08](../step08-reliability-design/) で **Datagram の上に信頼性を自前実装** します。
