interface NarrativeModalProps {
  title: string;
  text: string;
  onClose: () => void;
  closeLabel: string;
}

export function NarrativeModal({ title, text, onClose, closeLabel }: NarrativeModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{text}</p>
        <button type="button" onClick={onClose}>
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
