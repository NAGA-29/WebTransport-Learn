# Step 08 — 信頼性の自前設計

## 🎯 ゴール

- **Datagram の上に ACK/再送/重複排除** を自分で実装する
- Stream ではなく Datagram にこのレイヤを乗せる意義を判断できる
- Rust に移植しやすい pure な **状態機械** としてプロトコルを書ける

## なぜこの設計か

「確実に届けたいなら Stream を使えばいい」— 原則はそうです。ただし:

- 各メッセージが**小さく独立**していて、順序は要らないが 1 つも落としたくない
- **ウィンドウ制御や部分再送** を細かく自前で握りたい (ゲーム入力の巻き戻しなど)
- Stream 分割・終端処理のオーバーヘッドを避けたい

といった場合は Datagram + 軽量 ACK の方が適します。本 step では最小の仕組みを実装し、プロトコル層 (`protocol/reliable.js`) を **トランスポート非依存** の純粋関数状態機械にしました。将来そのまま Rust (`tokio::time::interval` + `bytes::Bytes`) へ書き起こせます。

## プロトコル形式

```
DATA : [tag=0x01][seq:u32-BE][payload...]
ACK  : [tag=0x02][seq:u32-BE]
```

送信側:
- `send(payload)` で seq を付けて送る
- `tick()` を定期実行し retryMs 経過 & 未 ACK のものを再送
- maxAttempts で諦め

受信側:
- DATA を受けたら ACK を即返す
- 直近の `windowSize` 個の seq を記憶して重複配達を防ぐ

## 実行手順

```bash
cd step08-reliability-design
npm install
npm start
# 別ターミナル
npm run serve-client
# Chrome で http://localhost:8080/  Connect
# loss sim (0〜1) に 0.2 などを入れて [Send 100 msgs]
# loss を模擬してもすべての seq が届くことを確認
```

## 確認ポイント

- サーバ側ログ `[server] deliver #N` が 1〜100 まで揃う
- クライアントの loss=0.3 でも数回の再送で届く (pending 数が波打つ)
- loss=1.0 にすると全滅し `✗ gave up` が出る

## 注意点

- 本実装は**簡易学習用**: 輻輳制御、RTT 推定、並列ウィンドウなどは省略
- 高頻度な再送が詰まると Datagram queue で drop される→ 本番は QUIC 本来の信頼機能 (Stream) に戻すことも検討

## 次へ

[Step 09](../step09-load-testing/) で**並列セッションの負荷**を測ります。
