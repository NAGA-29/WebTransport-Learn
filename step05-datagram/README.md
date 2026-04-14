# Step 05 — Datagram

## 🎯 ゴール

- WebTransport の **Datagram** で低遅延・非信頼な配送を体験する
- Stream との違い (順序/信頼/サイズ制約) を体感する
- loss 率を計測し、「失っても良いデータとは何か」を判断できる

## なぜこの設計か

Datagram は UDP のように:
- **再送なし** (失われたら失われたまま)
- **順序保証なし**
- **サイズは 1 パケットに収める必要** (典型 ~1200 bytes)

位置情報のように **「最新値が正義」「過去の値は既に陳腐化」** なデータは、Stream で信頼配送するより Datagram で撒く方が**レイテンシ面でもサーバ負荷面でも有利**です。

```
Stream          : 確実に届く / 順序保証 / 失敗時は再送で待たせる
Datagram        : 速い / 落ちるかも / 順序なし / 1 パケット
```

## 実行手順

```bash
cd step05-datagram
npm install
npm start
# 別ターミナル
npm run serve-client
# Chrome で http://localhost:8080/ を開く
# [Connect] → [Start sending] で 10Hz 位置情報を送信
```

## 確認ポイント

- ブラウザ側ログに 10 件ごとに `← ack:N,lat,lng (recv=..., sent=..., loss=...)` が出る
- ローカルでは loss は 0 に近いが、ネットワーク経由だと数 % 発生することがある
- `[Stop]` で累計を確認

## 注意点

- datagram で大きいペイロード (2KB〜) を送ると `write()` が失敗 or 黙って drop される
- 連発しすぎるとキューで drop される (フロー制御がないため)。必要なら送信側でレート制御する
- **Datagram に「確実性」を求めない**。必要なら step08 で自前 ACK を載せる (= そこまでやるなら最初から Stream を使う方が楽なことも多い)

## 次へ

[Step 06](../step06-realtime-chat/) で **Stream と Datagram を 1 つのアプリに共存** させます。
