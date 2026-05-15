export default function FmSysTag({ id, color, short }) {
  // If short is provided directly, use it; otherwise try to find from global FOREMAN_SYSTEMS
  const sys = short || (window.FOREMAN_SYSTEMS?.find?.((s) => s.id === id));

  if (!sys && !short) return null;

  const displayShort = short || sys?.short || id;

  return (
    <span
      style={{
        fontFamily: 'var(--fm-mono)',
        fontSize: 9.5,
        color: color || 'var(--fm-brass-dim)',
        letterSpacing: '0.10em',
        padding: '2px 5px',
        border: 'var(--fm-border-2)',
        textAlign: 'center',
        borderRadius: 'var(--fm-radius)',
        textTransform: 'uppercase',
      }}
    >
      {displayShort}
    </span>
  );
}
