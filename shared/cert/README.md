# 証明書について

WebTransport は HTTP/3 (QUIC + TLS 1.3) の上に立つため、**TLS 証明書が必須**です。本リポジトリでは学習用に自己署名証明書を使い、Chrome の `serverCertificateHashes` オプションで信頼させます。

## なぜ `serverCertificateHashes` を使うのか

通常 TLS 証明書は認証局 (CA) が署名したものをブラウザがルート証明書チェーンで検証します。
しかし学習用に毎回 Let's Encrypt を取得するのは現実的でないため、W3C は **「自己署名証明書でも、そのハッシュを事前にブラウザへ教えれば信頼する」** という抜け道を用意しました。これが `serverCertificateHashes` です。

この仕組みには Chrome により以下の制約があります:

| 項目 | 値 |
|------|----|
| 鍵アルゴリズム | ECDSA secp256r1 (P-256) のみ |
| 証明書ハッシュ | SHA-256 のみ |
| 有効期限 | **14 日以下** |

RSA 鍵や長期有効な証明書は拒否されます。必ず本スクリプトで生成した証明書を使ってください。

## 使い方

```bash
bash shared/cert/generate-cert.sh
```

- `certs/cert.pem`, `certs/key.pem` — サーバが読み込む
- `certs/cert.sha256.b64` — クライアント HTML に貼り付ける SHA-256 ハッシュ

各ステップの `server.js` は自動で `certs/cert.pem` を読み込み、各 `client.html` は `certs/cert.sha256.b64` の値を `serverCertificateHashes` に渡します（README の手順参照）。

## 有効期限が切れたら

単に再実行してください。PEM とハッシュが更新されます。クライアント HTML 側のハッシュ値も更新する必要があります。
