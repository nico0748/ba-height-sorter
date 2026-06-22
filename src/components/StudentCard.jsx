import { useState } from 'react'
import { iconUrl } from '../lib/game'

// 生徒アイコンカード。reveal=true のとき身長を表示する。
export default function StudentCard({
  student,
  reveal = false,
  state = null, // 'correct' | 'wrong' | null
  size = 84,
  draggable = false,
  onDragStart,
  onDragEnd,
  badge = null, // 左上に表示する任意ラベル（順番など）
}) {
  const [err, setErr] = useState(false)
  const cls = ['card']
  if (state) cls.push(state)
  if (draggable) cls.push('draggable')

  return (
    <div
      className={cls.join(' ')}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={student.name}
    >
      {badge != null && <span className="card-badge">{badge}</span>}
      <div className="card-img" style={{ width: size, height: size }}>
        {err ? (
          <div className="card-fallback">{student.name.slice(0, 2)}</div>
        ) : (
          <img
            src={iconUrl(student.id)}
            alt={student.name}
            width={size}
            height={size}
            draggable={false}
            onError={() => setErr(true)}
          />
        )}
      </div>
      <div className="card-name">{student.name}</div>
      {reveal && <div className="card-height">{student.height}cm</div>}
    </div>
  )
}
