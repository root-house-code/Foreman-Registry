export default function FmCard({ children, style = {} }) {
  return (
    <div
      style={{
        background: 'var(--fm-bg-raised)',
        border: 'var(--fm-border)',
        padding: '14px 18px',
        borderRadius: 'var(--fm-radius)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
