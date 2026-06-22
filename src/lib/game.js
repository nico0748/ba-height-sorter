import studentsData from '../data/students.json'

// SchaleDB 公式のアイコン画像URL
export const iconUrl = (id) =>
  `https://schaledb.com/images/student/icon/${id}.webp`

// 全生徒（身長昇順）
export const ALL = [...studentsData].sort((a, b) => a.height - b.height)

export const heightBand = (h) => Math.floor(h / 10) * 10 // 128 -> 120, 155 -> 150
export const bandLabel = (band) => `${band}cm台`

// 配列シャッフル（非破壊）
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const pickRandom = (arr, n) => shuffle(arr).slice(0, n)

// ───────────────────────────────────────────
// 並べ替えモード用の出題生成
// 難易度で「身長差」をコントロールする
//   easy   : 身長差が大きい（=見分けやすい）生徒を選ぶ
//   normal : ランダム
//   hard   : 身長が近い（=見分けにくい）生徒を選ぶ
// ───────────────────────────────────────────
export function makeSortRound(difficulty, count) {
  const n = Math.min(count, ALL.length)

  if (difficulty === 'easy') {
    // 身長レンジ全体を n 分割し、各区間から1名ずつ → 差が大きくなる
    const picked = []
    const seg = ALL.length / n
    for (let i = 0; i < n; i++) {
      const start = Math.floor(i * seg)
      const end = Math.floor((i + 1) * seg)
      const slice = ALL.slice(start, Math.max(end, start + 1))
      picked.push(slice[Math.floor(Math.random() * slice.length)])
    }
    return finalizeSort(picked)
  }

  if (difficulty === 'hard') {
    // ソート済み配列から連続する n 名の窓を取る → 身長が密集（同値も多い）
    const maxStart = ALL.length - n
    const start = Math.floor(Math.random() * (maxStart + 1))
    const picked = ALL.slice(start, start + n)
    return finalizeSort(picked)
  }

  // normal
  return finalizeSort(pickRandom(ALL, n))
}

function finalizeSort(picked) {
  const answer = [...picked].sort((a, b) => a.height - b.height)
  let shuffled = shuffle(picked)
  // 偶然そのまま正解の並びになっていたら引き直す
  if (shuffled.every((s, i) => s.height === answer[i].height)) {
    shuffled = shuffle(picked)
  }
  return { items: shuffled, answer }
}

// 並べ替え判定：身長が（同値を許して）昇順に並んでいればOK
export function checkSort(order) {
  return order.every((s, i) => i === 0 || order[i - 1].height <= s.height)
}

// ───────────────────────────────────────────
// グループ分けモード用の出題生成
//   easy   : 各身長帯の「中央寄り」の生徒（例 145, 155）→ 判別しやすい
//   hard   : 身長帯の「境界寄り」の生徒（例 149, 150, 159, 160）→ 紛らわしい
// ───────────────────────────────────────────
export function makeGroupRound(difficulty, count) {
  const n = Math.min(count, ALL.length)

  let pool = ALL
  if (difficulty === 'easy') {
    pool = ALL.filter((s) => {
      const r = s.height % 10
      return r >= 3 && r <= 6 // 中央寄り
    })
  } else if (difficulty === 'hard') {
    pool = ALL.filter((s) => {
      const r = s.height % 10
      return r <= 1 || r >= 8 // 境界寄り
    })
  }
  if (pool.length < n) pool = ALL

  const picked = pickRandom(pool, n)
  // 出題に含まれる身長帯だけをバケツにする
  const bands = [...new Set(picked.map((s) => heightBand(s.height)))].sort(
    (a, b) => a - b,
  )
  return { items: shuffle(picked), bands }
}
