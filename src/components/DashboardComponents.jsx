/**
 * Dashboard components for V1 Refined layout
 */

// Health Dial - SVG donut chart
export function V1HealthDial({ score }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 80 ? 'var(--fm-green)' : score >= 60 ? 'var(--fm-amber)' : 'var(--fm-red)';

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--fm-hairline2)" strokeWidth="3" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
        strokeLinecap="butt"
      />
      <text x="70" y="68" textAnchor="middle" fill="var(--fm-ink)" style={{ font: '500 36px var(--fm-serif)', letterSpacing: '-0.02em' }}>
        {score}
      </text>
      <text x="70" y="88" textAnchor="middle" fill="var(--fm-brass-dim)" style={{ font: '400 9px var(--fm-mono)', letterSpacing: '0.2em' }}>
        OF 100
      </text>
    </svg>
  );
}

// Queue Row - single task in triage queue
export function V1QueueRow({ task, done, onDone, statusColor, statusLabel, dueLabel, daysBetweenDays }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '62px 38px 1fr 1fr 78px 80px',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: '1px solid var(--fm-hairline)',
        opacity: done ? 0.35 : 1,
        transition: 'opacity .2s',
      }}
    >
      <span style={{ fontFamily: 'var(--fm-mono)', fontSize: 11, color: statusColor }}>
        {dueLabel}
      </span>
      <span
        style={{
          fontFamily: 'var(--fm-mono)',
          fontSize: 9.5,
          letterSpacing: '0.10em',
          color: 'var(--fm-brass-dim)',
          padding: '2px 5px',
          border: '1px solid var(--fm-hairline2)',
          borderRadius: 2,
          textAlign: 'center',
          textTransform: 'uppercase',
        }}
      >
        {task.system}
      </span>
      <span style={{ fontFamily: 'var(--fm-sans)', fontSize: 13, color: 'var(--fm-ink)', fontWeight: 500 }}>
        {task.item}
      </span>
      <span style={{ fontFamily: 'var(--fm-sans)', fontSize: 12.5, color: 'var(--fm-ink-dim)' }}>{task.task}</span>
      <span
        style={{
          fontFamily: 'var(--fm-mono)',
          fontSize: 10,
          letterSpacing: '0.06em',
          color: statusColor,
        }}
      >
        {done ? 'logged' : statusLabel}
      </span>
      <button
        onClick={onDone}
        disabled={done}
        style={{
          background: done ? 'transparent' : 'var(--fm-bg-panel)',
          border: `1px solid ${done ? 'var(--fm-hairline)' : 'var(--fm-brass)'}`,
          color: done ? 'var(--fm-ink-mute)' : 'var(--fm-brass)',
          fontFamily: 'var(--fm-mono)',
          fontSize: 10,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          padding: '5px 0',
          cursor: done ? 'default' : 'pointer',
          borderRadius: 3,
        }}
      >
        {done ? '✓ done' : 'mark done'}
      </button>
    </div>
  );
}

// System Row - per-system health with bar
export function V1SystemRow({ sys, health, stats }) {
  const color = health >= 80 ? 'var(--fm-green)' : health >= 60 ? 'var(--fm-amber)' : 'var(--fm-red)';
  const barCells = 24;
  const filled = Math.round((health / 100) * barCells);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '44px 1.4fr 200px 70px 1fr 90px',
        alignItems: 'center',
        gap: 14,
        padding: '9px 0',
        borderBottom: '1px solid var(--fm-hairline)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--fm-mono)',
          fontSize: 10,
          color: 'var(--fm-brass-dim)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {sys.short}
      </span>
      <span style={{ fontFamily: 'var(--fm-sans)', fontSize: 13.5, color: 'var(--fm-ink)', fontWeight: 500 }}>
        {sys.name}
      </span>
      <div style={{ display: 'flex', gap: 2 }}>
        {Array.from({ length: barCells }).map((_, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 10,
              background: i < filled ? color : 'var(--fm-hairline2)',
              opacity: i < filled ? 0.5 + 0.5 * (i / barCells) : 1,
            }}
          />
        ))}
      </div>
      <span style={{ fontFamily: 'var(--fm-mono)', fontSize: 12, color: 'var(--fm-ink)', textAlign: 'right' }}>
        {health}
      </span>
      <span style={{ fontFamily: 'var(--fm-mono)', fontSize: 11, color: 'var(--fm-ink-dim)' }}>
        {stats.overdue > 0 && <span style={{ color: 'var(--fm-red)' }}>{stats.overdue} overdue · </span>}
        {stats.soon > 0 && <span style={{ color: 'var(--fm-amber)' }}>{stats.soon} this wk · </span>}
        {stats.tasks} tasks
      </span>
      <span style={{ fontFamily: 'var(--fm-mono)', fontSize: 11, color: 'var(--fm-brass-dim)', textAlign: 'right' }}>
        next {stats.nextDueLabel || '—'}
      </span>
    </div>
  );
}

// Activity Chart - bar chart of completion history
export function V1ActivityChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 70 }}>
      {data.map((d, i) => {
        const h = (d.count / max) * 100;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              minHeight: 2,
              background: d.count === 0 ? 'var(--fm-hairline2)' : 'var(--fm-brass)',
              opacity: d.count === 0 ? 1 : 0.4 + (i / data.length) * 0.6,
            }}
          />
        );
      })}
    </div>
  );
}

// Section Label - reusable section header
export function V1SectionLabel({ children, right }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderBottom: '1px solid var(--fm-hairline)',
        paddingBottom: 6,
        marginBottom: 10,
      }}
    >
      <span
        style={{
          color: 'var(--fm-brass-dim)',
          fontFamily: 'var(--fm-mono)',
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        {children}
      </span>
      {right && (
        <span
          style={{
            color: 'var(--fm-ink-mute)',
            fontFamily: 'var(--fm-mono)',
            fontSize: 10,
            letterSpacing: '0.08em',
          }}
        >
          {right}
        </span>
      )}
    </div>
  );
}
