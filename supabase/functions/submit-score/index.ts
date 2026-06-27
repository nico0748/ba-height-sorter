// POST /submit-score
// 役割: 出題内容・回答・所要時間を検証してスコアを登録する。
// 不正対策:
//   1) 値域チェック（time_ms・name 長・カテゴリ）
//   2) IP レート制限（直近60秒の送信回数）
//   3) reCAPTCHA v3 検証（secret 設定時）
//   4) 出題内容＋回答の妥当性検証（正典身長と照合・正誤再計算）
//   5) サーバ発行トークン（セッション）で所要時間をサーバ計測（クライアント時刻を信用しない）
//   6) HMAC 署名検証（トークン改ざん検知）
import { corsHeaders, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/db.ts'
import { sign, safeEqual, ipHashOf, verifyRecaptcha } from '../_shared/security.ts'
import {
  isValidCategory,
  validateQuestion,
  timeBounds,
} from '../_shared/game.ts'

const RATE_WINDOW_SEC = 60
const RATE_MAX = 10 // 60秒あたり最大送信回数/IP
const SESSION_TTL_MS = 30 * 60 * 1000 // トークン有効期限 30分

// 制御文字（C0制御・DEL）を除去
const stripControl = (s: string) =>
  s.replace(/[\u0000-\u001f\u007f]/g, '')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const { token, sig, name, mode, diff, qCount, questions, recaptchaToken } =
    body ?? {}

  // ── 値域チェック ──
  if (!isValidCategory(mode, diff, Number(qCount)))
    return json({ error: 'invalid category' }, 400)
  if (typeof token !== 'string' || typeof sig !== 'string')
    return json({ error: 'token' }, 400)
  const cleanName = stripControl(String(name ?? '')).trim()
  if (cleanName.length < 1 || cleanName.length > 16)
    return json({ error: 'name' }, 400)
  if (!Array.isArray(questions) || questions.length !== Number(qCount))
    return json({ error: 'questions' }, 400)

  const secret = Deno.env.get('RANKING_HMAC_SECRET')
  const salt = Deno.env.get('IP_HASH_SALT') ?? 'kl-salt'
  if (!secret) return json({ error: 'server misconfigured' }, 500)

  const supabase = adminClient()
  const ip_hash = await ipHashOf(req, salt)

  // ── レート制限 ──
  const since = new Date(Date.now() - RATE_WINDOW_SEC * 1000).toISOString()
  const { count: recent } = await supabase
    .from('submission_log')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ip_hash)
    .gte('created_at', since)
  if ((recent ?? 0) >= RATE_MAX) return json({ error: 'rate limited' }, 429)
  await supabase.from('submission_log').insert({ ip_hash })

  // ── reCAPTCHA ──
  const rc = await verifyRecaptcha(recaptchaToken, Deno.env.get('RECAPTCHA_SECRET'))
  if (!rc.ok) return json({ error: 'recaptcha', reason: rc.reason }, 403)

  // ── セッション取得 ──
  const { data: session } = await supabase
    .from('game_sessions')
    .select('token, mode, diff, q_count, issued_at, used')
    .eq('token', token)
    .single()
  if (!session) return json({ error: 'session not found' }, 400)
  if (session.used) return json({ error: 'session used' }, 409)
  if (
    session.mode !== mode ||
    session.diff !== diff ||
    session.q_count !== Number(qCount)
  )
    return json({ error: 'session mismatch' }, 400)

  const issuedAt = new Date(session.issued_at).getTime()
  if (Date.now() - issuedAt > SESSION_TTL_MS)
    return json({ error: 'session expired' }, 400)

  // ── HMAC 署名検証 ──
  const expectSig = await sign(
    secret,
    `${token}.${issuedAt}.${mode}.${diff}.${qCount}`,
  )
  if (!safeEqual(sig, expectSig)) return json({ error: 'bad signature' }, 403)

  // ── 出題内容＋回答の検証（全問正解必須） ──
  for (const q of questions) {
    const r = validateQuestion(mode, diff, q)
    if (!r.ok) {
      await supabase.from('game_sessions').update({ used: true }).eq('token', token)
      return json({ registered: false, reason: r.reason })
    }
  }

  // ── 所要時間（サーバ計測）の妥当性 ──
  const timeMs = Date.now() - issuedAt
  const { min, max } = timeBounds(mode, diff, Number(qCount))
  await supabase.from('game_sessions').update({ used: true }).eq('token', token)
  if (timeMs < min) return json({ registered: false, reason: 'too fast' })
  if (timeMs > max) return json({ registered: false, reason: 'too slow' })

  // ── 登録 ──
  const { error: insErr } = await supabase.from('scores').insert({
    mode,
    diff,
    q_count: Number(qCount),
    name: cleanName,
    time_ms: timeMs,
  })
  if (insErr) return json({ error: 'db insert' }, 500)

  // 順位算出（自分より速い件数 + 1）
  const { count: faster } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true })
    .eq('mode', mode)
    .eq('diff', diff)
    .eq('q_count', Number(qCount))
    .lt('time_ms', timeMs)

  return json({ registered: true, timeMs, rank: (faster ?? 0) + 1 })
})
