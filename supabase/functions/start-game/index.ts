// POST /start-game
// 役割: ゲーム開始時にサーバ側でセッション（トークン）を発行し、所要時間計測の起点とする。
// 返却: { token, sig, issuedAt }  ※sig はトークン改ざん検知用の HMAC 署名
import { corsHeaders, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/db.ts'
import { sign, ipHashOf } from '../_shared/security.ts'
import { isValidCategory } from '../_shared/game.ts'
import { verifyRecaptcha } from '../_shared/security.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const { mode, diff, qCount, recaptchaToken } = body ?? {}
  if (!isValidCategory(mode, diff, Number(qCount)))
    return json({ error: 'invalid category' }, 400)

  // bot対策（任意・secret設定時のみ有効）
  const rc = await verifyRecaptcha(
    recaptchaToken,
    Deno.env.get('RECAPTCHA_SECRET'),
  )
  if (!rc.ok) return json({ error: 'recaptcha', reason: rc.reason }, 403)

  const secret = Deno.env.get('RANKING_HMAC_SECRET')
  const salt = Deno.env.get('IP_HASH_SALT') ?? 'kl-salt'
  if (!secret) return json({ error: 'server misconfigured' }, 500)

  const supabase = adminClient()
  const ip_hash = await ipHashOf(req, salt)

  const { data, error } = await supabase
    .from('game_sessions')
    .insert({ mode, diff, q_count: Number(qCount), ip_hash })
    .select('token, issued_at')
    .single()

  if (error || !data) return json({ error: 'db' }, 500)

  const issuedAt = new Date(data.issued_at).getTime()
  const sig = await sign(
    secret,
    `${data.token}.${issuedAt}.${mode}.${diff}.${qCount}`,
  )

  return json({ token: data.token, sig, issuedAt })
})
