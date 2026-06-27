import { useState, useEffect } from 'react'
import StudentCard from './StudentCard'
import { heightBand, bandLabel } from '../lib/game'
import TimeBar from './TimeBar'

export default function GroupGame({
  round,
  onScore,
  onNext,
  isLast = false,
  timeLimit = null,
}) {
  // studentId -> band(数値) または null（未分類プール）
  const [assign, setAssign] = useState(() =>
    Object.fromEntries(round.items.map((s) => [s.id, null])),
  )
  const [dragId, setDragId] = useState(null)
  const [selId, setSelId] = useState(null) // タップ操作用の選択中カード
  const [checked, setChecked] = useState(false)
  const [timeLeft, setTimeLeft] = useState(timeLimit)

  const place = (id, band) => {
    if (id == null || checked) return
    setAssign((a) => ({ ...a, [id]: band }))
    setSelId(null)
  }

  const drop = (band) => {
    place(dragId, band)
    setDragId(null)
  }

  const inBand = (band) => round.items.filter((s) => assign[s.id] === band)
  const pool = round.items.filter((s) => assign[s.id] === null)

  const allPlaced = pool.length === 0
  const isCorrect = (s) => assign[s.id] === heightBand(s.height)
  const score = round.items.filter(isCorrect).length

  const submit = () => {
    if (checked) return
    setChecked(true)
    onScore(score === round.items.length, {
      students: round.items.map((s) => ({ id: s.id, height: s.height })),
      answer: { ...assign },
    })
  }

  // 制限時間のカウントダウン（timeLimit 指定時のみ）。0 で強制締め切り。
  useEffect(() => {
    if (!timeLimit || checked) return
    if (timeLeft <= 0) {
      submit()
      return
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLimit, checked, timeLeft])

  const cardProps = (s) => ({
    student: s,
    reveal: checked,
    state: checked ? (isCorrect(s) ? 'correct' : 'wrong') : null,
    size: 64,
    draggable: !checked,
    onDragStart: () => setDragId(s.id),
    onDragEnd: () => setDragId(null),
  })

  // タップ操作：プールやバケツのカードをクリックで選択
  const selectableClick = (s) => () => {
    if (checked) return
    setSelId((cur) => (cur === s.id ? null : s.id))
  }

  return (
    <div className="game">
      <p className="instruction">
        各生徒を正しい <b>身長帯</b> のグループに入れてください。
        ドラッグ＆ドロップ、またはカードをタップ → 入れたい帯をタップ。
      </p>

      {timeLimit != null && !checked && (
        <TimeBar timeLeft={timeLeft} timeLimit={timeLimit} />
      )}

      <div className="buckets">
        {round.bands.map((band) => (
          <div
            key={band}
            className={'bucket' + (selId != null ? ' droppable' : '')}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(band)}
            onClick={() => selId != null && place(selId, band)}
          >
            <div className="bucket-title">{bandLabel(band)}</div>
            <div className="bucket-body">
              {inBand(band).map((s) => (
                <div
                  key={s.id}
                  className={'pick' + (selId === s.id ? ' selected' : '')}
                  onClick={(e) => {
                    e.stopPropagation()
                    selectableClick(s)()
                  }}
                >
                  <StudentCard {...cardProps(s)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        className="pool"
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => drop(null)}
      >
        <div className="pool-title">未分類（{pool.length}）</div>
        <div className="pool-body">
          {pool.map((s) => (
            <div
              key={s.id}
              className={'pick' + (selId === s.id ? ' selected' : '')}
              onClick={selectableClick(s)}
            >
              <StudentCard {...cardProps(s)} />
            </div>
          ))}
        </div>
      </div>

      {!checked ? (
        <button className="primary-btn" disabled={!allPlaced} onClick={submit}>
          {allPlaced ? '答え合わせ' : `未分類が残っています（${pool.length}）`}
        </button>
      ) : (
        <div className="result">
          <p
            className={
              'verdict ' + (score === round.items.length ? 'ok' : 'ng')
            }
          >
            {score} / {round.items.length} 名 正解
            {score === round.items.length
              ? ' 🎉'
              : timeLimit != null && timeLeft <= 0
                ? '（時間切れ ⏱）'
                : ''}
          </p>
          <button className="primary-btn" onClick={onNext}>
            {isLast ? '結果を見る →' : '次の問題 →'}
          </button>
        </div>
      )}
    </div>
  )
}
