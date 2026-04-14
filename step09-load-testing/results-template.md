# Step09 計測結果テンプレート

実行日: YYYY-MM-DD

## 環境

| 項目 | 値 |
|------|----|
| OS | |
| CPU | |
| RAM | |
| Node.js | |
| ネットワーク | loopback / LAN / WAN |
| 回線 RTT | |

## 実行コマンド

```bash
node bench-client.js --sessions 50 --per-session 200 --payload 256
```

## 結果

| 項目 | 値 |
|------|----|
| connect success | /50 |
| total requests | |
| elapsed | s |
| throughput | req/s |
| RTT P50 | ms |
| RTT P95 | ms |
| RTT P99 | ms |
| RTT max | ms |

## 観察 / 考察

- CPU 使用率が飽和する地点:
- RTT P99 が跳ねる条件:
- 同時 session 数を 2 倍にしたときの挙動:
