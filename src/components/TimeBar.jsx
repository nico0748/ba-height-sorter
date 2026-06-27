// 制限時間のカウントダウン表示（残り時間バー）
export default function TimeBar({ timeLeft, timeLimit }) {
  const ratio = Math.max(0, Math.min(1, timeLeft / timeLimit))
  const danger = timeLeft <= 10
  return (
    <div className={'timebar' + (danger ? ' danger' : '')}>
      <span className="timebar-label">⏱ 残り {Math.max(0, timeLeft)}秒</span>
      <span className="timebar-track">
        <span className="timebar-fill" style={{ width: `${ratio * 100}%` }} />
      </span>
    </div>
  )
}
