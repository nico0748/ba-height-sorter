// localStorage ベースのランキングストア
// カテゴリ = プレイスタイル(mode) × 難易度(diff) × 問題数(qCount)
// クリアタイム（ミリ秒）の昇順で上位を保持する

const KEY = 'ba-height-sorter:rankings:v1'
const NAME_KEY = 'ba-height-sorter:lastName'
const MAX_ENTRIES = 10

export const categoryKey = (mode, diff, qCount) => `${mode}:${diff}:${qCount}`

function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

function saveAll(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* ストレージ不可（プライベートモード等）は黙って無視 */
  }
}

export function getRanking(mode, diff, qCount) {
  return loadAll()[categoryKey(mode, diff, qCount)] || []
}

// 記録を追加し、{ rank, list } を返す。
// rank は 1 始まり。上位 MAX_ENTRIES から外れた場合は null。
export function addRecord(mode, diff, qCount, { name, timeMs, date }) {
  const all = loadAll()
  const key = categoryKey(mode, diff, qCount)
  const entry = { name, timeMs, date }
  const list = [...(all[key] || []), entry].sort((a, b) => a.timeMs - b.timeMs)
  const trimmed = list.slice(0, MAX_ENTRIES)
  all[key] = trimmed
  saveAll(all)
  const idx = trimmed.indexOf(entry)
  return { rank: idx === -1 ? null : idx + 1, list: trimmed }
}

export const loadLastName = () => {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

export const saveLastName = (name) => {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    /* 無視 */
  }
}

// ミリ秒 → "M:SS.cc" または "SS.cc秒"
export function formatTime(ms) {
  const totalCs = Math.round(ms / 10) // センチ秒
  const cs = totalCs % 100
  const totalSec = Math.floor(totalCs / 100)
  const sec = totalSec % 60
  const min = Math.floor(totalSec / 60)
  const pad = (n) => String(n).padStart(2, '0')
  if (min > 0) return `${min}:${pad(sec)}.${pad(cs)}`
  return `${sec}.${pad(cs)}秒`
}
