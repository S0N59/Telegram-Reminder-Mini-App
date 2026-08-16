import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = true
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  const resolvedConfirm = confirmLabel || confirmText;
  const resolvedCancel = cancelLabel || cancelText;

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-modal-buttons">
          <button type="button" className="confirm-modal-btn cancel" onClick={onCancel}>
            {resolvedCancel}
          </button>
          <button 
            type="button"
            className={`confirm-modal-btn confirm ${isDestructive ? 'destructive' : ''}`} 
            onClick={onConfirm}
          >
            {resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
};
