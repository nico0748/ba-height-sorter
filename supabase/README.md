# オンラインランキング（Supabase）セットアップ

全端末で共有されるランキングを、Supabase（Postgres＋Edge Functions）で提供します。
スコアの書き込みは必ず Edge Function を経由し、サーバ側で検証します。

## 構成

- `migrations/0001_ranking_init.sql` … テーブル（`scores` / `game_sessions` / `submission_log`）と RLS。
- `functions/start-game` … ゲーム開始時にトークン（＋HMAC署名）を発行。所要時間計測の起点。
- `functions/submit-score` … 出題内容・回答・所要時間を検証してスコア登録。
- `functions/_shared` … 検証ロジック・正典身長・HMAC/IPハッシュ/reCAPTCHA ユーティリティ。

## 不正対策（実装済み）

1. 値域チェック：`time_ms`(1秒〜60分)・`name`(1〜16文字)・カテゴリの厳密検証。
2. IP レート制限：同一IP（ハッシュ）からの送信を直近60秒で最大10回まで。
3. reCAPTCHA v3：`RECAPTCHA_SECRET` 設定時に検証（スコア閾値0.5）。
4. 出題内容＋回答の検証：送られた各問の生徒身長を**正典データと照合**し改ざんを排除、
   正誤をサーバで再計算。全問正解のみ登録。
5. サーバ発行トークン：開始時刻をサーバが保持し、**所要時間をサーバ計測**（クライアント時刻を信用しない）。
   トークンは一度きり・30分で失効。
6. HMAC 署名：`token.issuedAt.category` を署名し、送信時に検証（改ざん検知）。

> 注: クライアント送信である以上、原理的に完全防止は不可能です。本実装はカジュアル用途として
> 妥当な多層防御です。より厳格にするなら、出題自体をサーバ生成にする等が考えられます。

## 手順

前提: [Supabase CLI](https://supabase.com/docs/guides/cli) と Supabase プロジェクト。

```bash
# 1) ログイン & プロジェクト紐付け
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>

# 2) DB マイグレーション適用
supabase db push       # もしくは SQL エディタで migrations/0001_ranking_init.sql を実行

# 3) サーバ secret 設定
supabase secrets set RANKING_HMAC_SECRET="$(openssl rand -hex 32)"
supabase secrets set IP_HASH_SALT="$(openssl rand -hex 16)"
# 任意（reCAPTCHA を使う場合）
supabase secrets set RECAPTCHA_SECRET="<reCAPTCHAのシークレット>"
# 任意（CORS を自サイトに限定）
supabase secrets set ALLOWED_ORIGIN="https://<あなたの配信ドメイン>"

# 4) Edge Functions デプロイ（JWT 検証なしの公開関数）
supabase functions deploy start-game --no-verify-jwt
supabase functions deploy submit-score --no-verify-jwt
```

## クライアント側の設定

`.env.example` を参考に、配信先（Vercel/Netlify/Cloudflare Pages 等）の環境変数に設定:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_RECAPTCHA_SITE_KEY=<任意: reCAPTCHA v3 サイトキー>
```

これらが未設定の場合、アプリは自動的に**端末内ローカルランキング**で動作します（オフライン互換）。

## 動作

開始時に `start-game` でトークン取得 → プレイ → 終了時に `submit-score` へ出題・回答を送信。
全問正解かつ検証通過時のみ登録され、順位が返ります。一覧は PostgREST の公開 SELECT で取得します。
