export default function FmStatusDot({ status }) {
  const colorMap = {
    overdue: 'var(--fm-red)',
    soon: 'var(--fm-amber)',
    scheduled: 'var(--fm-brass)',
    default: 'var(--fm-green)',
  };

  const color = colorMap[status] || colorMap.default;

  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
      }}
    />
  );
}
