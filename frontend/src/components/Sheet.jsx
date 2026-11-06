// Mobilon alulról felcsúszó, asztalon középre igazított űrlap-panel.
export default function Sheet({ title, onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Bezárás">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
