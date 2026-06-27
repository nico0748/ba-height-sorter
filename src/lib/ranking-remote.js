// Supabase を使ったオンラインランキング連携。
// 環境変数（ビルド時, VITE_ 接頭辞のみクライアントへ露出）:
//   VITE_SUPABASE_URL        例: https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY   公開用 anon キー
//   VITE_RECAPTCHA_SITE_KEY  reCAPTCHA v3 サイトキー（任意）

const URL = import.meta.env.VITE_SUPABASE_URL
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY
const RECAPTCHA_SITE = import.meta.env.VITE_RECAPTCHA_SITE_KEY

// リモート機能が使えるか（未設定ならローカル localStorage にフォールバック）
export const remoteEnabled = () => Boolean(URL && ANON)

const fnBase = () => `${URL}/functions/v1`
const restBase = () => `${URL}/rest/v1`
const authHeaders = () => ({
  apikey: ANON,
  Authorization: `Bearer ${ANON}`,
  'Content-Type': 'application/json',
})

// ── reCAPTCHA v3 ──
let recaptchaLoading = null
function loadRecaptcha() {
  if (!RECAPTCHA_SITE) return Promise.resolve(false)
  if (window.grecaptcha) return Promise.resolve(true)
  if (recaptchaLoading) return recaptchaLoading
  recaptchaLoading = new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE}`
    s.async = true
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
  })
  return recaptchaLoading
}

async function recaptchaToken(action) {
  if (!RECAPTCHA_SITE) return undefined
  try {
    const ok = await loadRecaptcha()
    if (!ok || !window.grecaptcha) return undefined
    await new Promise((r) => window.grecaptcha.ready(r))
    return await window.grecaptcha.execute(RECAPTCHA_SITE, { action })
  } catch {
    return undefined
  }
}

// ゲーム開始：サーバからトークン＋署名を取得（所要時間計測の起点）
export async function startGame({ mode, diff, qCount }) {
  const recaptcha = await recaptchaToken('start_game')
  const res = await fetch(`${fnBase()}/start-game`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ mode, diff, qCount, recaptchaToken: recaptcha }),
  })
  if (!res.ok) throw new Error(`start-game ${res.status}`)
  return res.json() // { token, sig, issuedAt }
}

// スコア送信：出題内容・回答・トークンを送ってサーバ検証＆登録
export async function submitScore({
  token,
  sig,
  name,
  mode,
  diff,
  qCount,
  questions,
}) {
  const recaptcha = await recaptchaToken('submit_score')
  const res = await fetch(`${fnBase()}/submit-score`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      token,
      sig,
      name,
      mode,
      diff,
      qCount,
      questions,
      recaptchaToken: recaptcha,
    }),
  })
  if (!res.ok) throw new Error(`submit-score ${res.status}`)
  return res.json() // { registered, rank?, timeMs?, reason? }
}

// リーダーボード取得（PostgREST 直読み・公開SELECT）
export async function fetchScores(mode, diff, qCount, limit = 50) {
  const q = new URLSearchParams({
    mode: `eq.${mode}`,
    diff: `eq.${diff}`,
    q_count: `eq.${qCount}`,
    order: 'time_ms.asc,created_at.asc',
    limit: String(limit),
    select: 'name,time_ms,created_at',
  })
  const res = await fetch(`${restBase()}/scores?${q}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`scores ${res.status}`)
  const rows = await res.json()
  // ローカル形式（timeMs, date）に合わせて返す
  return rows.map((r) => ({ name: r.name, timeMs: r.time_ms, date: r.created_at }))
}
