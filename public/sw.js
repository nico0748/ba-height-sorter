/* キヴォトス・ラインアップ！ Service Worker
   - アプリシェル/アセット: キャッシュ優先（オフライン対応）
   - SchaleDB のアイコン画像: 取得後キャッシュ（次回オフラインでも表示）
   ハッシュ付きアセットに対応するためランタイムキャッシュ方式を採用。 */
const VERSION = 'v1'
const APP_CACHE = `kl-app-${VERSION}`
const IMG_CACHE = `kl-img-${VERSION}`

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k !== APP_CACHE && k !== IMG_CACHE)
          .map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // SchaleDB の生徒アイコン: キャッシュ優先 + 背景更新
  if (url.hostname.endsWith('schaledb.com')) {
    e.respondWith(
      (async () => {
        const cache = await caches.open(IMG_CACHE)
        const hit = await cache.match(req)
        const fetching = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone())
            return res
          })
          .catch(() => hit)
        return hit || fetching
      })(),
    )
    return
  }

  // 同一オリジンのみ扱う
  if (url.origin !== self.location.origin) return

  // ナビゲーション: ネット優先、失敗時はキャッシュした index にフォールバック
  if (req.mode === 'navigate') {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(req)
          const cache = await caches.open(APP_CACHE)
          cache.put('./', res.clone())
          return res
        } catch {
          const cache = await caches.open(APP_CACHE)
          return (
            (await cache.match('./')) ||
            (await cache.match(req)) ||
            Response.error()
          )
        }
      })(),
    )
    return
  }

  // それ以外のアセット: キャッシュ優先 + 取得時に保存
  e.respondWith(
    (async () => {
      const cache = await caches.open(APP_CACHE)
      const hit = await cache.match(req)
      if (hit) return hit
      try {
        const res = await fetch(req)
        if (res && res.status === 200 && res.type === 'basic') {
          cache.put(req, res.clone())
        }
        return res
      } catch {
        return hit || Response.error()
      }
    })(),
  )
})
