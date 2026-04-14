# Step 02 — Hello WebTransport

## 🎯 ゴール

- Node.js で WebTransport サーバを起動し、Chrome から接続する
- `WebTransport` API の `ready` / `closed` Promise を理解する
- 自己署名証明書の SHA-256 ハッシュでサーバを信頼する仕組みを体験する

## なぜこの設計か

WebSocket は接続が張れれば即データ送受信できましたが、WebTransport は **`session.ready` を待つ** 必要があります。これは QUIC + TLS 1.3 のハンドシェイクが完了したことを示します。
また **接続単位 (session)** と **ストリーム単位 (stream)** が明確に分離されているため、まずは「session を張るだけ」で終わるこの step で、その感覚を掴みます。

## 実行手順

```bash
# 1. 証明書を生成 (リポジトリ直下で 1 回だけ)
bash shared/cert/generate-cert.sh

# 2. このディレクトリで依存をインストール
cd step02-webtransport-hello
npm install

# 3. サーバ起動
npm start
#   🚀 HTTP/3 (WebTransport) server listening on https://0.0.0.0:4433/step02

# 4. 別ターミナルで静的サーバ (client.html を配信)
npm run serve-client
#   📂 static server: http://localhost:8080/

# 5. Chrome で http://localhost:8080/ を開く
#    certs/cert.sha256.b64 の内容を入力欄に貼って [Connect]
```

## 確認ポイント

- サーバ側ログに `🔗 session accepted: /step02` と `→ hello! session established`
- ブラウザ側ログに `✅ session ready`
- ブラウザを閉じると `👋 session closed` が両側に出る

## 注意点 / よくある罠

- **ハッシュが違うと `ready` で reject する**: 証明書を再生成したらブラウザ側の値も更新すること。
- **証明書の有効期限 (13 日) を超えると接続拒否**: 再度 `generate-cert.sh` を実行。
- **Chrome 以外** (Firefox/Safari) はこの学習リポジトリでは動作しません。
- ポート 4433 が他プロセスと衝突する場合は `server.js` と `client.html` の両方で変更。

## 次へ

[Step 03 — Unidirectional Stream](../step03-unidirectional-stream/) へ。session の上に 1 本目の Stream を流します。
