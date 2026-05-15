export default function FmCaps({ children, color, size = 10, style }) {
  return (
    <span
      style={{
        fontFamily: 'var(--fm-mono)',
        fontSize: size,
        color: color || 'var(--fm-ink-mute)',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
