#!/usr/bin/env bash
# ECDSA P-256 自己署名証明書を生成し、Chrome の serverCertificateHashes で
# 信頼させるための SHA-256 ハッシュ (base64) を出力する。
#
# Chrome の制約:
#   - 鍵: ECDSA secp256r1 (P-256) 必須 (RSA 不可)
#   - ハッシュ: SHA-256 のみ
#   - 有効期限: 14 日以下
#
# 本スクリプトは安全マージンを見て 13 日にしてある。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CERT_DIR="$REPO_ROOT/certs"
DAYS=13
SUBJ="/CN=localhost"

mkdir -p "$CERT_DIR"

KEY="$CERT_DIR/key.pem"
CERT="$CERT_DIR/cert.pem"
DER="$CERT_DIR/cert.der"
HASH_FILE="$CERT_DIR/cert.sha256.b64"

echo "[1/4] ECDSA P-256 鍵ペアを生成..."
openssl ecparam -name prime256v1 -genkey -noout -out "$KEY"

echo "[2/4] 自己署名証明書を生成 (有効期限 ${DAYS} 日)..."
openssl req -new -x509 \
  -key "$KEY" \
  -out "$CERT" \
  -days "$DAYS" \
  -subj "$SUBJ" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "[3/4] DER 形式へ変換..."
openssl x509 -in "$CERT" -outform DER -out "$DER"

echo "[4/4] SHA-256 ハッシュを base64 で出力..."
HASH="$(openssl dgst -sha256 -binary "$DER" | openssl base64 -A)"
echo "$HASH" > "$HASH_FILE"

cat <<EOF

✅ 証明書生成完了

  鍵 (PEM)       : $KEY
  証明書 (PEM)   : $CERT
  証明書 (DER)   : $DER
  SHA-256 (b64)  : $HASH

次の手順:
  1. サーバ起動時に \$CERT, \$KEY を読み込む (各 step の server.js が自動で読みます)
  2. クライアント HTML の <CERT_HASH_BASE64> を以下で置換:

       $HASH

  または各 step README の手順に従って設定してください。

⚠️  有効期限は ${DAYS} 日です。期限切れ後は再実行してください。
EOF
