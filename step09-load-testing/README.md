# Step 09 — 負荷テスト

## 🎯 ゴール

- 並列 session / 並列 stream の**スケール特性** を実測する
- RTT P50 / P95 / P99 / throughput の 4 指標で "速さ" を語れるようになる
- サーバ設計のどこが先に詰まるかを知る

## なぜこの設計か

「動いた」と「本番で耐える」の間には必ず計測が要ります。ベンチは `@fails-components/webtransport` のサーバ兼クライアント API を使って **ヘッドレス** で実行し、ブラウザ依存を外します。

本 step の bench-client は:

1. N 並列 session を張る
2. 各 session で M 回 bidirectional stream の往復 (echo) を測る
3. 全 RTT の分布と throughput を出す

という最もシンプルな測定です。

## 実行手順

```bash
cd step09-load-testing
npm install
# 別ターミナルで
npm start

# ベンチ実行 (小規模から始める)
node bench-client.js --sessions 10 --per-session 100 --payload 128

# 徐々に規模を上げて限界を探る
node bench-client.js --sessions 50 --per-session 200 --payload 256
node bench-client.js --sessions 200 --per-session 100 --payload 1024
```

結果は `results-template.md` にコピーして埋めてください。

## 確認ポイント

- connect success がセッション数と一致 (FD 不足や backlog 溢れで途中から失敗し始める)
- RTT P99 が跳ねる地点 = 何かが詰まっているサイン (CPU / Flow control / GC)
- payload を 10KB にすると throughput は頭打ちになるが RTT も伸びるか？

## 落とし穴

- loopback では OS ネットワークスタックのコストが無視できる。実際の LAN / WAN では別物。
- Node.js シングルスレッド: ベンチ側もサーバ側も **1 コア** で動くので、並列度を上げる前に CPU 使用率を監視する (`top`)。
- Datagram ベンチではパケットドロップが起きやすい (step05 / step08 で実測可)。

## 次へ

最後の [Step 10 — Architecture](../step10-architecture/) で**本番運用** の設計図を描きます。
