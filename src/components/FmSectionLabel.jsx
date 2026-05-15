export default function FmSectionLabel({ children, right }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderBottom: 'var(--fm-border)',
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
