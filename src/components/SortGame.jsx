import { useState, useEffect } from 'react'
import StudentCard from './StudentCard'
import { checkSort } from '../lib/game'
import TimeBar from './TimeBar'

export default function SortGame({
  round,
  onScore,
  onNext,
  isLast = false,
  timeLimit = null,
}) {
  const [order, setOrder] = useState(round.items)
  const [dragIndex, setDragIndex] = useState(null)
  const [checked, setChecked] = useState(false)
  const [timeLeft, setTimeLeft] = useState(timeLimit)

  const submit = () => {
    if (checked) return
    setChecked(true)
    onScore(checkSort(order), {
      students: round.items.map((s) => ({ id: s.id, height: s.height })),
      answer: order.map((s) => s.id),
    })
  }

  // 制限時間のカウントダウン（timeLimit 指定時のみ）
  useEffect(() => {
    if (!timeLimit || checked) return
    if (timeLeft <= 0) {
      submit()
      return
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLimit, checked, timeLeft])

  const move = (from, to) => {
    if (to < 0 || to >= order.length || from === to) return
    const next = [...order]
    const [it] = next.splice(from, 1)
    next.splice(to, 0, it)
    setOrder(next)
  }

  const handleDrop = (target) => {
    if (dragIndex === null) return
    move(dragIndex, target)
    setDragIndex(null)
  }

  const correct = checked && checkSort(order)

  // 本来あるべき並び（身長昇順）の各位置の身長
  const targetHeights = order.map((s) => s.height).sort((a, b) => a - b)

  // 各カードの正誤：その位置に本来あるべき身長と一致するかで判定。
  // 同身長は入れ替え可能なので、身長が一致していれば正解扱い。
  const cardState = (i) => {
    if (!checked) return null
    return order[i].height === targetHeights[i] ? 'correct' : 'wrong'
  }

  return (
    <div className="game">
      <p className="instruction">
        カードを <b>左（低い）→ 右（高い）</b> の身長順に並べてください。
        ドラッグ＆ドロップ、または ◀ ▶ ボタンで移動できます。
      </p>

      {timeLimit != null && !checked && (
        <TimeBar timeLeft={timeLeft} timeLimit={timeLimit} />
      )}

      <div className="sort-row">
        {order.map((s, i) => (
          <div
            key={s.id}
            className="sort-slot"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i)}
          >
            <StudentCard
              student={s}
              reveal={checked}
              state={cardState(i)}
              draggable={!checked}
              badge={i + 1}
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => setDragIndex(null)}
            />
            {!checked && (
              <div className="move-btns">
                <button onClick={() => move(i, i - 1)} disabled={i === 0}>
                  ◀
                </button>
                <button
                  onClick={() => move(i, i + 1)}
                  disabled={i === order.length - 1}
                >
                  ▶
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!checked ? (
        <button className="primary-btn" onClick={submit}>
          答え合わせ
        </button>
      ) : (
        <div className="result">
          <p className={correct ? 'verdict ok' : 'verdict ng'}>
            {correct
              ? '正解！ 🎉'
              : timeLimit != null && timeLeft <= 0
                ? '時間切れ… ⏱'
                : '残念… 並びが違います'}
          </p>
          <button className="primary-btn" onClick={onNext}>
            {isLast ? '結果を見る →' : '次の問題 →'}
          </button>
        </div>
      )}
    </div>
  )
}
