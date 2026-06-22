import { useState } from 'react'
import StudentCard from './StudentCard'
import { checkSort } from '../lib/game'

export default function SortGame({ round, onScore, onNext, isLast = false }) {
  const [order, setOrder] = useState(round.items)
  const [dragIndex, setDragIndex] = useState(null)
  const [checked, setChecked] = useState(false)

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

  // 各カードの正誤（昇順の連続性で判定）
  const cardState = (i) => {
    if (!checked) return null
    const okPrev = i === 0 || order[i - 1].height <= order[i].height
    const okNext = i === order.length - 1 || order[i].height <= order[i + 1].height
    return okPrev && okNext ? 'correct' : 'wrong'
  }

  return (
    <div className="game">
      <p className="instruction">
        カードを <b>左（低い）→ 右（高い）</b> の身長順に並べてください。
        ドラッグ＆ドロップ、または ◀ ▶ ボタンで移動できます。
      </p>

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
        <button
          className="primary-btn"
          onClick={() => {
            const ok = checkSort(order)
            setChecked(true)
            onScore(ok)
          }}
        >
          答え合わせ
        </button>
      ) : (
        <div className="result">
          <p className={correct ? 'verdict ok' : 'verdict ng'}>
            {correct ? '正解！ 🎉' : '残念… 並びが違います'}
          </p>
          <button className="primary-btn" onClick={onNext}>
            {isLast ? '結果を見る →' : '次の問題 →'}
          </button>
        </div>
      )}
    </div>
  )
}
