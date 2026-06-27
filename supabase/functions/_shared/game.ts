// サーバ側のゲーム定義・検証ロジック（クライアントの src/lib/game.js と整合）
import HEIGHTS from './heights.json' with { type: 'json' }

// 正典の身長マップ（id -> cm）。クライアントが送ってくる身長はこれと照合する。
export const CANON: Record<string, number> = HEIGHTS as Record<string, number>

export const MODES = ['sort', 'group'] as const
export const DIFFS = ['easy', 'normal', 'hard', 'extreme', 'insane'] as const
export const QCOUNTS = [1, 5, 10] as const

// プレイスタイル×難易度ごとの出題人数（クライアント COUNTS と一致）
export const COUNTS: Record<string, Record<string, number>> = {
  sort: { easy: 4, normal: 6, hard: 8, extreme: 10, insane: 12 },
  group: { easy: 10, normal: 20, hard: 30, extreme: 40, insane: 50 },
}

// 1問あたりの制限時間（秒）。Insane のみ。
export const TIME_LIMIT: Record<string, Record<string, number>> = {
  sort: { insane: 45 },
  group: { insane: 80 },
}

export const heightBand = (h: number) => Math.floor(h / 10) * 10

export const isValidCategory = (mode: string, diff: string, qCount: number) =>
  (MODES as readonly string[]).includes(mode) &&
  (DIFFS as readonly string[]).includes(diff) &&
  (QCOUNTS as readonly number[]).includes(qCount)

export const expectedCount = (mode: string, diff: string) =>
  COUNTS[mode]?.[diff] ?? 0

const distinctCount = (arr: number[]) => new Set(arr).size

// 1問の検証。question = { students:[{id,height}], answer }
//   sort:  answer = [id,...]（並べた順）
//   group: answer = { [id]: band }
// 戻り値: { ok:boolean, reason?:string }
export function validateQuestion(
  mode: string,
  diff: string,
  q: { students?: { id: number; height: number }[]; answer?: unknown },
): { ok: boolean; reason?: string } {
  const students = q?.students
  if (!Array.isArray(students)) return { ok: false, reason: 'students不正' }

  const n = expectedCount(mode, diff)
  if (students.length !== n) return { ok: false, reason: '人数不一致' }

  // id の一意性・正典との身長一致（身長の詐称を防止）
  const ids = new Set<number>()
  for (const s of students) {
    if (typeof s?.id !== 'number' || typeof s?.height !== 'number')
      return { ok: false, reason: 'student形式不正' }
    if (ids.has(s.id)) return { ok: false, reason: 'id重複' }
    ids.add(s.id)
    const canon = CANON[String(s.id)]
    if (canon === undefined) return { ok: false, reason: '未知のid' }
    if (canon !== s.height) return { ok: false, reason: '身長改ざん' }
  }

  // 身長の種類数ルール（出題人数-2 以上）。データ上限でクランプ。
  const need = Math.min(Math.max(1, n - 2), distinctCount(Object.values(CANON)))
  if (distinctCount(students.map((s) => s.height)) < need)
    return { ok: false, reason: '身長の多様性不足' }

  // 正誤判定
  if (mode === 'sort') {
    const ans = q.answer as number[]
    if (!Array.isArray(ans) || ans.length !== n)
      return { ok: false, reason: 'answer不正' }
    const byId = new Map(students.map((s) => [s.id, s.height]))
    // answer が students の並べ替えであること
    const ansSet = new Set(ans)
    if (ansSet.size !== n || ![...ansSet].every((id) => byId.has(id)))
      return { ok: false, reason: 'answer集合不一致' }
    const heights = ans.map((id) => byId.get(id) as number)
    const sorted = [...heights].sort((a, b) => a - b)
    const correct = heights.every((h, i) => h === sorted[i])
    return correct ? { ok: true } : { ok: false, reason: '並び不正解' }
  }

  if (mode === 'group') {
    const ans = (q.answer ?? {}) as Record<string, number>
    for (const s of students) {
      const band = ans[String(s.id)]
      if (typeof band !== 'number')
        return { ok: false, reason: '未分類あり' }
      if (band !== heightBand(s.height))
        return { ok: false, reason: 'グループ不正解' }
    }
    return { ok: true }
  }

  return { ok: false, reason: 'mode不正' }
}

// 所要時間の妥当範囲（ミリ秒）。人数×問題数から最小所要を見積もる。
export function timeBounds(mode: string, diff: string, qCount: number) {
  const total = expectedCount(mode, diff) * qCount
  // 1要素あたり最低 ~250ms は要すると仮定（これ未満は機械的操作とみなす）
  const min = Math.max(1000, Math.round(total * 250))
  const max = 60 * 60 * 1000 // 60分
  return { min, max }
}
