// Fixed, decorative background: drifting emerald/cyan aurora fields plus film grain. CSS-only, no JS.
export default function Aurora() {
  return (
    <>
      <div className="aurora" aria-hidden="true" data-testid="aurora">
        <span />
        <span />
        <span />
      </div>
      <div className="grain" aria-hidden="true" />
    </>
  );
}
