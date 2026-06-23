// セクション見出し用のピクトグラム集（stroke ベースで統一）
const PATHS = {
  user: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 19.5c0-3.4 2.9-5.6 6.5-5.6s6.5 2.2 6.5 5.6" />
    </>
  ),
  style: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.6" />
    </>
  ),
  difficulty: (
    <>
      <rect x="4" y="13" width="3.4" height="7" rx="1" />
      <rect x="10.3" y="9" width="3.4" height="11" rx="1" />
      <rect x="16.6" y="5" width="3.4" height="15" rx="1" />
    </>
  ),
  count: (
    <path d="M9.5 4 L7.5 20 M16.5 4 L14.5 20 M4 9 H20 M4 15 H20" />
  ),
  stats: (
    <>
      <path d="M4 4 V20 H20" />
      <path d="M8 17 V12" />
      <path d="M12.5 17 V8" />
      <path d="M17 17 V14" />
    </>
  ),
  stopwatch: (
    <>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 13.5 V9.5 M12 13.5 L15 15" />
      <path d="M9.5 3.5 H14.5 M12 3.5 V6.5" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4 H17 V8 a5 5 0 0 1 -10 0 Z" />
      <path d="M7 5 H4.5 V6.2 a3 3 0 0 0 3 3" />
      <path d="M17 5 H19.5 V6.2 a3 3 0 0 1 -3 3" />
      <path d="M12 13 V16 M9 20 H15 M10 20 a2 2 0 0 1 4 0" />
    </>
  ),
  flag: (
    <>
      <path d="M6 4 V20" />
      <path d="M6 5 H17 L14.5 8.5 L17 12 H6" />
    </>
  ),
  ruler: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="1.6" transform="rotate(-0 0 0)" />
      <path d="M7 8 V11 M11 8 V12 M15 8 V11 M19 8 V12" />
    </>
  ),
}

export default function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.flag}
    </svg>
  )
}
