// HMAC 署名・IPハッシュ・reCAPTCHA 検証のユーティリティ
const enc = new TextEncoder()

const toBase64Url = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

async function hmacKey(secret: string) {
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

// payload に対する HMAC-SHA256（base64url）
export async function sign(secret: string, payload: string): Promise<string> {
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return toBase64Url(sig)
}

// タイミング安全比較
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// SHA-256 16進
export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(s))
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// リクエストから IP を推定し、ソルト付きでハッシュ化（生IPは保存しない）
export async function ipHashOf(req: Request, salt: string): Promise<string> {
  const fwd = req.headers.get('x-forwarded-for') ?? ''
  const ip = fwd.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'unknown'
  return await sha256Hex(`${salt}:${ip}`)
}

// reCAPTCHA v3 検証。secret 未設定なら検証スキップ（true）。
export async function verifyRecaptcha(
  token: string | undefined,
  secret: string | undefined,
  minScore = 0.5,
): Promise<{ ok: boolean; reason?: string }> {
  if (!secret) return { ok: true } // 未設定環境では無効化
  if (!token) return { ok: false, reason: 'recaptcha欠落' }
  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
    })
    const data = await res.json()
    if (!data.success) return { ok: false, reason: 'recaptcha失敗' }
    if (typeof data.score === 'number' && data.score < minScore)
      return { ok: false, reason: 'recaptchaスコア低' }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'recaptcha検証エラー' }
  }
}
