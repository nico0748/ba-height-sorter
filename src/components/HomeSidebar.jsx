import { useState } from 'react'
import { BAND_STATS, bandLabel, ALL } from '../lib/game'
import { getRanking, formatTime } from '../lib/ranking'
import BandModal from './BandModal'

const MAX = Math.max(...BAND_STATS.map((b) => b.count))

// modeLabel/diffLabel: 表示用のラベル文字列
export default function HomeSidebar({ mode, diff, qCount, modeLabel, diffLabel }) {
  const top = getRanking(mode, diff, qCount).slice(0, 3)
  const [openBand, setOpenBand] = useState(null)

  return (
    <aside className="home-side">
      <section className="side-card">
        <h2>
          <span className="bar" />
          身長分布
        </h2>
        <ul className="dist">
          {BAND_STATS.map(({ band, count }) => (
            <li key={band}>
              <button
                type="button"
                className="dist-row"
                onClick={() => setOpenBand(band)}
                title={`${bandLabel(band)}の生徒を数直線で見る`}
              >
                <span className="dist-label">{bandLabel(band)}</span>
                <span className="dist-track">
                  <span
                    className="dist-fill"
                    style={{ width: `${(count / MAX) * 100}%` }}
                  />
                </span>
                <span className="dist-count">{count}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="side-foot">タップで数直線表示 ／ 収録 {ALL.length} 名</p>
      </section>

      <section className="side-card">
        <h2>
          <span className="bar" />
          ベストタイム
        </h2>
        <p className="side-sub">
          {modeLabel}・{diffLabel}・全{qCount}問
        </p>
        {top.length === 0 ? (
          <p className="side-empty">まだ記録がありません。全問正解でランクイン！</p>
        ) : (
          <ol className="besttimes">
            {top.map((r, i) => (
              <li key={i} className={'bt-row bt-' + (i + 1)}>
                <span className="bt-rank">{i + 1}</span>
                <span className="bt-name">{r.name}</span>
                <span className="bt-time">{formatTime(r.timeMs)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {openBand != null && (
        <BandModal band={openBand} onClose={() => setOpenBand(null)} />
      )}
    </aside>
  )
}
