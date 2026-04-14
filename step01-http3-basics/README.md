# Step 01 — HTTP/3 と QUIC の基礎

## 🎯 ゴール

- HTTP/1.1 → HTTP/2 → HTTP/3 の進化の背景を説明できる
- QUIC が「UDP 上に TLS 1.3 と多重ストリームを載せたトランスポート」であることを理解する
- WebTransport が QUIC の上に立つ理由を説明できる

## なぜこの設計か

WebTransport を学ぶ前に、その土台である **QUIC / HTTP/3** を理解しないと、WebSocket との違いや Stream/Datagram の意義が腑に落ちません。

### TCP ベースの HTTP/2 の限界

```
HTTP/2 over TCP
┌───────────────────────────────────┐
│ 1 本の TCP コネクション            │
│  ┌─────┐ ┌─────┐ ┌─────┐          │
│  │s1   │ │s2   │ │s3   │  ← ストリーム多重化は HTTP/2 層  │
│  └─────┘ └─────┘ └─────┘          │
└───────────────────────────────────┘
        ↓
  TCP は 1 パケット落ちると後続の全ストリームが止まる (HoL blocking)
```

### QUIC (HTTP/3)

```
HTTP/3 over QUIC (UDP)
┌─────────────────────────────────────────────┐
│ 1 本の QUIC コネクション (UDP)               │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌──────────┐       │
│  │s1   │ │s2   │ │s3   │ │datagram  │       │
│  └─────┘ └─────┘ └─────┘ └──────────┘       │
│  各 stream は独立してロス回復 → HoL blocking 解消  │
│  TLS 1.3 ハンドシェイクはコネクションと一体化 → 0-RTT 可能 │
└─────────────────────────────────────────────┘
```

**WebTransport はこの QUIC の Stream と Datagram をブラウザから直接使える API** です。WebSocket のように TCP の HoL blocking に縛られず、UDP 的な非信頼配送もブラウザから選べます。

## 実行手順

```bash
node check-http3.js https://cloudflare-quic.com
```

`Alt-Svc: h3=...` ヘッダの有無を確認し、対象サイトが HTTP/3 を advertise しているかを表示します。`curl --http3` がインストールされていれば追加で HTTP/3 での実 GET も試します。

## 確認ポイント

- Cloudflare / Google / Akamai のサイトは `Alt-Svc` で `h3` を告知している
- `curl --http3 -I https://cloudflare-quic.com` がステータス 200 を返す（curl が HTTP/3 対応ビルドの場合）

## 注意点

- `fetch` から HTTP/3 を強制することは Node.js 標準 API では不可。ブラウザも接続をサーバ通知 (`Alt-Svc`) で昇格させる。
- 学習目的のためローカル QUIC 実装は step02 以降で `@fails-components/webtransport` を使って立ち上げます。

## 次へ

[Step 02 — Hello WebTransport](../step02-webtransport-hello/) へ進み、実際に QUIC 上で WebTransport セッションを張ります。
