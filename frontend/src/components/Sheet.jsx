import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

// Mobilon alulról felcsúszó, asztalon középre igazított űrlap-panel.
// Esc zár, a Tab a panelen belül marad, bezáráskor a fókusz visszakerül az előző elemre.
export default function Sheet({ title, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    return () => previous?.focus?.();
  }, []);

  function onKeyDown(e) {
    if (e.key === 'Escape') return onClose();
    if (e.key !== 'Tab') return;
    const items = [...ref.current.querySelectorAll(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-label={title} onKeyDown={onKeyDown} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Bezárás">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
