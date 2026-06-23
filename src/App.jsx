import { useEffect, useState } from 'react'
import SortGame from './components/SortGame'
import GroupGame from './components/GroupGame'
import HomeSidebar from './components/HomeSidebar'
import Icon from './components/Icon'
import { makeSortRound, makeGroupRound, ALL } from './lib/game'
import {
  addRecord,
  getRanking,
  formatTime,
  loadLastName,
  saveLastName,
} from './lib/ranking'

const MODES = [
  { id: 'sort', label: '並べ替え', desc: '身長順に低い→高いで並べる' },
  { id: 'group', label: 'グループ分け', desc: '身長帯（140cm台など）に振り分ける' },
]

const DIFFS = [
  { id: 'easy', label: 'Easy', desc: '身長差が大きく見分けやすい' },
  { id: 'normal', label: 'Normal', desc: 'ランダム出題' },
  { id: 'hard', label: 'Hard', desc: '身長が近く紛らわしい' },
]

// プレイスタイルごとの「出題人数」を難易度に割り当てる
const COUNTS = {
  sort: { easy: 4, normal: 6, hard: 8 },
  group: { easy: 10, normal: 20, hard: 30 },
}

const QCOUNTS = [1, 5, 10]

const countOf = (mode, diff) => COUNTS[mode][diff]
const labelOf = (arr, id) => arr.find((x) => x.id === id)?.label ?? id

export default function App() {
  const [view, setView] = useState('setup') // 'setup' | 'play' | 'result' | 'ranking'
  const [name, setName] = useState(loadLastName)
  const [mode, setMode] = useState('sort')
  const [diff, setDiff] = useState('normal')
  const [qCount, setQCount] = useState(5)

  const [round, setRound] = useState(null)
  const [roundKey, setRoundKey] = useState(0)
  const [session, setSession] = useState(null)
  // session: { mode, diff, qCount, total, idx, correct, startTime, endTime }
  const [result, setResult] = useState(null)
  // result: { timeMs, correct, total, allCorrect, rank }

  const makeRound = (m, d) =>
    m === 'sort'
      ? makeSortRound(d, countOf('sort', d))
      : makeGroupRound(d, countOf('group', d))

  const start = () => {
    const cleanName = name.trim()
    if (!cleanName) return
    saveLastName(cleanName)
    setSession({
      mode,
      diff,
      qCount,
      total: qCount,
      idx: 0,
      correct: 0,
      startTime: Date.now(),
      endTime: null,
    })
    setRound(makeRound(mode, diff))
    setRoundKey((k) => k + 1)
    setView('play')
  }

  // 各問の答え合わせ時に呼ばれる
  const onScore = (won) => {
    setSession((s) => {
      const isLast = s.idx + 1 >= s.total
      return {
        ...s,
        correct: s.correct + (won ? 1 : 0),
        // 最終問題の答え合わせ時点で計測を止める
        endTime: isLast ? Date.now() : s.endTime,
      }
    })
  }

  // 「次の問題 / 結果を見る」押下時。副作用を伴うため updater 内ではなくここで実行する
  // （StrictMode で updater が二重呼び出しされ記録が重複するのを避ける）
  const onNext = () => {
    const s = session
    if (!s) return
    if (s.idx + 1 < s.total) {
      setRound(makeRound(s.mode, s.diff))
      setRoundKey((k) => k + 1)
      setSession({ ...s, idx: s.idx + 1 })
      return
    }
    // セッション終了 → 結果集計
    const timeMs = (s.endTime ?? Date.now()) - s.startTime
    const allCorrect = s.correct === s.total
    let rank = null
    if (allCorrect) {
      rank = addRecord(s.mode, s.diff, s.qCount, {
        name: name.trim(),
        timeMs,
        date: new Date().toISOString(),
      }).rank
    }
    setResult({ timeMs, correct: s.correct, total: s.total, allCorrect, rank })
    setView('result')
  }

  const quit = () => {
    setSession(null)
    setRound(null)
    setView('setup')
  }

  return (
    <div className="app">
      {view !== 'setup' && (
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <span className="halo" />
              <span className="logo">KL</span>
            </span>
            <span className="brand-text">
              <h1 className="title-jp">キヴォトス・ラインアップ！</h1>
              <span className="title-en">KIVOTOS LINEUP — 身長ソート</span>
            </span>
          </div>
          {view === 'play' && session && (
            <div className="scoreboard">
              <Timer startTime={session.startTime} endTime={session.endTime} />
              <span>
                問題 {session.idx + 1} / {session.total}
              </span>
              <button className="ghost-btn" onClick={quit}>
                中断
              </button>
            </div>
          )}
        </header>
      )}

      {view === 'setup' && (
        <Setup
          {...{ name, setName, mode, setMode, diff, setDiff, qCount, setQCount }}
          onStart={start}
          onShowRanking={() => setView('ranking')}
        />
      )}

      {view === 'play' && session && (
        <main className="play">
          <div className={'round-meta rm-' + diff}>
            {labelOf(MODES, mode)}・{labelOf(DIFFS, diff)}（{countOf(mode, diff)}
            名）・全
            {session.total}問
          </div>
          {mode === 'sort' ? (
            <SortGame
              key={roundKey}
              round={round}
              onScore={onScore}
              onNext={onNext}
              isLast={session.idx + 1 >= session.total}
            />
          ) : (
            <GroupGame
              key={roundKey}
              round={round}
              onScore={onScore}
              onNext={onNext}
              isLast={session.idx + 1 >= session.total}
            />
          )}
        </main>
      )}

      {view === 'result' && result && (
        <ResultScreen
          name={name.trim()}
          mode={mode}
          diff={diff}
          qCount={qCount}
          result={result}
          onReplay={start}
          onSetup={quit}
          onShowRanking={() => setView('ranking')}
        />
      )}

      {view === 'ranking' && (
        <RankingScreen
          initial={{ mode, diff, qCount }}
          onBack={() => setView(session ? 'result' : 'setup')}
        />
      )}

      <footer className="foot">
        <p className="foot-disclaimer">
          本サイトは非公式のファン制作ゲームです。Nexon Games／Yostar
          をはじめとする『ブルーアーカイブ』の権利者・運営とは一切関係ありません。
        </p>
        <p className="foot-disclaimer">
          『ブルーアーカイブ』の二次創作ガイドラインを遵守して制作しており、公式から
          許諾・後援・提携を受けたものではありません。キャラクター等の著作権は
          原権利者に帰属します。問題がある場合は速やかに対応・公開を停止します。
        </p>
        <p>
          データ出典:{' '}
          <a href="https://schaledb.com" target="_blank" rel="noreferrer">
            SchaleDB
          </a>{' '}
          ／ 収録 {ALL.length} 名
        </p>
      </footer>
    </div>
  )
}

function Timer({ startTime, endTime }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (endTime) return
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [endTime])
  return <span className="timer">⏱ {formatTime((endTime ?? now) - startTime)}</span>
}

const NAV = [
  { id: null, icon: 'home', label: 'ホーム' },
  { id: 'sec-play', icon: 'style', label: '挑戦設定' },
  { id: 'sec-stats', icon: 'stats', label: '身長分布' },
  { id: 'sec-rank', icon: 'stopwatch', label: 'ベストタイム' },
  { id: 'sec-howto', icon: 'flag', label: '遊び方' },
]

const goTo = (id) => {
  if (!id) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function Setup({
  name,
  setName,
  mode,
  setMode,
  diff,
  setDiff,
  qCount,
  setQCount,
  onStart,
  onShowRanking,
}) {
  const ready = !!name.trim()

  return (
    <div className="layout">
      {/* ===== 左サイドバー ===== */}
      <aside className="sidebar">
        <div className="side-brand">
          <span className="brand-mark" aria-hidden="true">
            <span className="halo" />
            <span className="logo">KL</span>
          </span>
          <span className="brand-text">
            <span className="side-brand-jp">キヴォトス・ラインアップ！</span>
            <span className="side-brand-en">KIVOTOS LINEUP</span>
          </span>
        </div>

        <div className="cfg side-acc">
          <div className="side-acc-h">先生のお名前</div>
          <input
            className="name-input"
            type="text"
            value={name}
            maxLength={16}
            placeholder="ニックネーム"
            onChange={(e) => setName(e.target.value)}
          />
          <span className="hint">
            ※ランキング表示用・この端末に記録されます
          </span>
        </div>

        <nav className="side-nav">
          {NAV.map((n) => (
            <button key={n.label} onClick={() => goTo(n.id)}>
              <span className="nav-ico">
                <Icon name={n.icon} size={18} />
              </span>
              {n.label}
            </button>
          ))}
          <button onClick={onShowRanking}>
            <span className="nav-ico">
              <Icon name="trophy" size={18} />
            </span>
            ランキングを見る
          </button>
        </nav>
      </aside>

      {/* ===== メイン ===== */}
      <main className="main">
        <div className="hero">
          <div className="hero-badge">KIVOTOS LINEUP</div>
          <h1 className="hero-title">キヴォトス・ラインアップ！</h1>
          <div className="hero-en">身長ソート＆グループ分けゲーム</div>
          <p className="hero-lead">
            ブルーアーカイブの生徒を身長順に並べたり、身長帯ごとに振り分けたり。
            キヴォトスの先生として、生徒たちの身長を当てよう。
          </p>
          <div className="hero-tags">
            <span>
              <Icon name="user" size={15} />全{ALL.length}名から出題
            </span>
            <span>
              <Icon name="difficulty" size={15} />難易度3段階
            </span>
            <span>
              <Icon name="trophy" size={15} />端末ランキング
            </span>
          </div>
          <button
            className="hero-cta"
            onClick={ready ? onStart : () => goTo('sec-play')}
          >
            <Icon name="flag" size={20} /> いますぐ挑戦する
          </button>
        </div>

        {/* 挑戦設定 */}
        <section className="cfg" id="sec-play">
          <h2>
            <span className="h2-ico">
              <Icon name="style" />
            </span>
            挑戦設定
          </h2>

          <div className="set-block">
            <div className="set-label">プレイスタイル</div>
            <div className="opts">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  className={'opt' + (mode === m.id ? ' active' : '')}
                  onClick={() => setMode(m.id)}
                >
                  <b>{m.label}</b>
                  <span>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="set-block">
            <div className="set-label">難易度（出題人数）</div>
            <div className="opts">
              {DIFFS.map((d) => (
                <button
                  key={d.id}
                  className={
                    'opt opt-' + d.id + (diff === d.id ? ' active' : '')
                  }
                  onClick={() => setDiff(d.id)}
                >
                  <b>
                    {d.label}（{countOf(mode, d.id)}名）
                  </b>
                  <span>{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="set-block">
            <div className="set-label">問題数</div>
            <div className="opts counts">
              {QCOUNTS.map((c) => (
                <button
                  key={c}
                  className={'opt' + (qCount === c ? ' active' : '')}
                  onClick={() => setQCount(c)}
                >
                  <b>{c}問</b>
                </button>
              ))}
            </div>
          </div>

          <div className="start-row">
            <button
              className="primary-btn big"
              onClick={onStart}
              disabled={!ready}
            >
              ▶ ゲームスタート
            </button>
            {!ready && (
              <span className="hint">スタートには名前の入力が必要です。</span>
            )}
          </div>
        </section>

        {/* 身長分布 ＋ ベストタイム */}
        <div className="main-row">
          <HomeSidebar
            mode={mode}
            diff={diff}
            qCount={qCount}
            modeLabel={labelOf(MODES, mode)}
            diffLabel={labelOf(DIFFS, diff)}
          />
        </div>

        {/* 遊び方 */}
        <section className="cfg" id="sec-howto">
          <h2>
            <span className="h2-ico">
              <Icon name="flag" />
            </span>
            遊び方
          </h2>
          <ol className="howto">
            <li>
              <b>名前を入力</b>して、プレイスタイル・難易度・問題数を選びます。
            </li>
            <li>
              <b>並べ替え</b>は生徒を低い→高い身長順に、
              <b>グループ分け</b>は身長帯（140cm台など）ごとに振り分けます。
            </li>
            <li>
              <b>答え合わせ</b>で正誤を判定。全問正解ならクリアタイムが
              ランキングに登録されます。
            </li>
          </ol>
        </section>
      </main>
    </div>
  )
}

function ResultScreen({
  name,
  mode,
  diff,
  qCount,
  result,
  onReplay,
  onSetup,
  onShowRanking,
}) {
  const { timeMs, correct, total, allCorrect, rank } = result
  return (
    <main className="setup">
      <Section title="結果" icon="flag">
        <div className="result-card">
          <div className="result-time">{formatTime(timeMs)}</div>
          <div className="result-sub">
            {labelOf(MODES, mode)}・{labelOf(DIFFS, diff)}・全{total}問 ／ 正解{' '}
            {correct} / {total}
          </div>
          {allCorrect ? (
            <p className="verdict ok">
              全問正解！ 🎉{' '}
              {rank
                ? `ランキング ${rank} 位に登録しました`
                : 'ランキング圏外でした'}
            </p>
          ) : (
            <p className="verdict ng">
              全問正解ではないため、タイムはランキングに登録されません。
            </p>
          )}
        </div>
      </Section>
      <div className="setup-actions">
        <button className="primary-btn big" onClick={onReplay}>
          もう一度（{name}）
        </button>
        <button className="ghost-btn" onClick={onShowRanking}>
          ランキングを見る
        </button>
        <button className="ghost-btn" onClick={onSetup}>
          設定に戻る
        </button>
      </div>
    </main>
  )
}

function RankingScreen({ initial, onBack }) {
  const [mode, setMode] = useState(initial.mode)
  const [diff, setDiff] = useState(initial.diff)
  const [qCount, setQCount] = useState(initial.qCount)

  const list = getRanking(mode, diff, qCount)

  return (
    <main className="setup">
      <Section title="ランキング（クリアタイム）" icon="trophy">
        <div className="rank-filters">
          <Pills items={MODES} value={mode} onChange={setMode} />
          <Pills items={DIFFS} value={diff} onChange={setDiff} />
          <Pills
            items={QCOUNTS.map((c) => ({ id: c, label: `${c}問` }))}
            value={qCount}
            onChange={setQCount}
          />
        </div>

        {list.length === 0 ? (
          <p className="hint">まだ記録がありません。全問正解でクリアすると登録されます。</p>
        ) : (
          <ol className="rank-list">
            {list.map((e, i) => (
              <li key={i} className="rank-row">
                <span className="rank-no">{i + 1}</span>
                <span className="rank-name">{e.name}</span>
                <span className="rank-time">{formatTime(e.timeMs)}</span>
                <span className="rank-date">
                  {new Date(e.date).toLocaleDateString('ja-JP')}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>
      <button className="ghost-btn" onClick={onBack}>
        ← 戻る
      </button>
    </main>
  )
}

function Pills({ items, value, onChange }) {
  return (
    <div className="pills">
      {items.map((it) => (
        <button
          key={it.id}
          className={'pill' + (value === it.id ? ' active' : '')}
          onClick={() => onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <section className="cfg">
      <h2>
        <span className="h2-ico">
          <Icon name={icon} />
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}
