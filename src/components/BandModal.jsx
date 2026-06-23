import { useEffect, useState } from 'react'
import { studentsInBand, bandLabel, iconUrl } from '../lib/game'

// 身長帯の数直線モーダル。クリックされた帯の生徒を、身長位置に縦積みで配置する。
export default function BandModal({ band, onClose }) {
  // Esc で閉じる
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const list = studentsInBand(band)
  const cms = Array.from({ length: 10 }, (_, i) => band + i) // 例: 150..159
  const byCm = cms.map((cm) => ({
    cm,
    students: list.filter((s) => s.height === cm),
  }))

  // ポップイン演出用の通し番号（左下から順に出る）
  let order = 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${bandLabel(band)}の身長分布`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>
            {bandLabel(band)}
            <span className="modal-count">{list.length}名</span>
          </h2>
          <button className="modal-close" aria-label="閉じる" onClick={onClose}>
            ×
          </button>
        </div>

        <p className="modal-sub">アイコンが指す目盛りが、その生徒の身長です。</p>

        <div className="numline-scroll">
          <div className="numline">
            <div className="nl-axis" />
            {byCm.map(({ cm, students }) => (
              <div className="nl-col" key={cm}>
                <div className="nl-stack">
                  {students.map((s) => (
                    <NLIcon key={s.id} student={s} delay={order++ * 0.05} />
                  ))}
                </div>
                <span className={'nl-mark' + (students.length ? ' on' : '')} />
                <span className="nl-cm">{cm}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function NLIcon({ student, delay }) {
  const [err, setErr] = useState(false)
  return (
    <span className="nl-icon" style={{ animationDelay: `${delay}s` }} title={student.name}>
      {err ? (
        <span className="nl-fallback">{student.name.slice(0, 2)}</span>
      ) : (
        <img
          src={iconUrl(student.id)}
          alt={student.name}
          width={44}
          height={44}
          draggable={false}
          onError={() => setErr(true)}
        />
      )}
    </span>
  )
}
