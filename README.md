# WebTransport-Learn

WebTransport を「WebSocket の延長」ではなく、**Stream と Datagram を明確に分離した次世代トランスポート**として正しく学ぶためのハンズオン学習リポジトリです。初心者から中級者向けに 10 ステップで設計意図まで踏み込みます。

---

## 🚨 この学習レポジトリの原則

1. **WebSocket の延長として実装しない** — WebSocket は 1 本の TCP に多重化されない stream しか持たない。WebTransport は Stream / Datagram / Multiplex を前提に設計する。
2. **Stream と Datagram を必ず分離** — 「信頼が必要な本文は Stream」「低遅延で失っても良いイベントは Datagram」を徹底。
3. **動くだけで終わらせない** — 各 step の README で「なぜこの設計か」を言語化する。
4. **Node.js に閉じない** — プロトコル層を pure JS で抽出し、将来 Rust (`wtransport` crate) へ移植可能な構成にしておく。
5. **負荷とスケールを意識** — step09 で実測し、step10 で本番構成を設計する。

---

## 📁 カリキュラム

| Step | テーマ | 主な概念 |
|------|--------|----------|
| [01](./step01-http3-basics/) | HTTP/3 と QUIC の基礎 | QUIC, TLS1.3, 0-RTT, Head-of-Line blocking |
| [02](./step02-webtransport-hello/) | Hello WebTransport | 接続確立、証明書ハッシュ信頼 |
| [03](./step03-unidirectional-stream/) | Unidirectional Stream | サーバ→クライアントの片方向配信 |
| [04](./step04-bidirectional-stream/) | Bidirectional Stream | request/response、信頼配送 |
| [05](./step05-datagram/) | Datagram | 低遅延・非信頼、UDP ライクな使い方 |
| [06](./step06-realtime-chat/) | Stream vs Datagram | 同一アプリで両方を使い分け |
| [07](./step07-multiplexing/) | Multiplexing | ルーム管理、HoL blocking 回避 |
| [08](./step08-reliability-design/) | 信頼性の自前設計 | Datagram 上の ACK / 再送 |
| [09](./step09-load-testing/) | 負荷テスト | 並列セッション、RTT、throughput |
| [10](./step10-architecture/) | アーキテクチャ設計 | Edge / Fanout / Scale-out / Rust 移行 |

---

## ✅ 前提環境

| 項目 | 要件 |
|------|------|
| OS | Linux / macOS / Windows (WSL2 推奨) |
| Node.js | 20 以上（ESM, fetch, WebStreams 標準対応） |
| ブラウザ | **Chrome 97+ 必須**（Firefox/Safari は 2026 時点で未対応 or 部分対応） |
| OpenSSL | 1.1 以上（ECDSA P-256 証明書生成用） |

---

## 🚀 はじめかた

```bash
# 1. 証明書を生成（有効期限 13 日の ECDSA P-256 自己署名）
bash shared/cert/generate-cert.sh

# 2. 各ステップに移動して依存をインストール
cd step02-webtransport-hello
npm install

# 3. サーバ起動
npm start

# 4. Chrome で client.html を開く（README の手順どおり）
```

各ステップの README に詳細手順を記載しています。

---

## 🧱 リポジトリ構造

```
WebTransport-Learn/
├── shared/
│   ├── cert/              # 証明書生成スクリプトと解説
│   └── protocol/          # Rust 移植を意識した pure JS プロトコル層
├── step01-http3-basics/
├── step02-webtransport-hello/
├── ...
└── step10-architecture/
```

`shared/protocol/` 配下の JS はトランスポート非依存の純粋関数で構成してあり、将来そのまま Rust へ書き起こせる粒度を維持します。

---

## ⚠️ 学習用途限定の注意

- 自己署名証明書の有効期限は 14 日まで（Chrome の制約）。本番には Let's Encrypt などの正規 CA を使う。
- `@fails-components/webtransport` は libquiche バイナリに依存するため、環境によっては `npm install` に失敗することがあります。各 step README の Troubleshooting を参照してください。
- 本リポジトリのコードは **学習用最小実装** です。本番運用には認証・認可・レート制御・監視などの実装が別途必要です。

---

## 🔥 最終ゴール

- WebTransport でリアルタイム基盤を**設計できる**
- Stream と Datagram を**使い分けできる**
- 負荷と障害に**耐える設計**ができる
- Node.js で動かしつつ、Rust への**移行ロードマップ**が描ける
