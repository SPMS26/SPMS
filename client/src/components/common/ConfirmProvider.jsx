import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ConfirmContext = createContext(null);

// Promise-based confirmation dialog, used instead of window.confirm / window.prompt:
//   if (!(await confirm({ title, message, confirmLabel, danger }))) return;
// With `input` it collects a value and resolves to that string, or null when cancelled:
//   const value = await confirm({ title, input: { label, type, minLength } });
export const ConfirmProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const resolver = useRef(null);
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const inputRef = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve;
    setValue('');
    setError('');
    setDialog(options);
  }), []);

  const close = useCallback((result) => {
    setDialog(null);
    const resolve = resolver.current;
    resolver.current = null;
    if (resolve) resolve(result);
  }, []);

  const cancel = useCallback(() => close(dialog?.input ? null : false), [close, dialog]);

  const accept = () => {
    if (!dialog.input) {
      close(true);
      return;
    }
    const min = dialog.input.minLength || 1;
    if (value.length < min) {
      setError(`Must be at least ${min} character${min === 1 ? '' : 's'}.`);
      inputRef.current?.focus();
      return;
    }
    close(value);
  };

  // Destructive dialogs focus Cancel, so a stray Enter cannot confirm them
  useEffect(() => {
    if (!dialog) return;
    (dialog.input ? inputRef : dialog.danger ? cancelRef : confirmRef).current?.focus();
    const onKey = (e) => e.key === 'Escape' && cancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, cancel]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="modal-overlay active confirm-overlay" onClick={cancel}>
          <div
            className="modal-box confirm-box"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-title" className={`confirm-title ${dialog.danger ? 'danger' : ''}`}>{dialog.title}</h3>
            {dialog.message && <p className="confirm-message">{dialog.message}</p>}

            {dialog.input && (
              <form onSubmit={(e) => { e.preventDefault(); accept(); }}>
                <label className="auth-label" htmlFor="confirm-input">{dialog.input.label}</label>
                <input
                  id="confirm-input"
                  ref={inputRef}
                  className="auth-input"
                  type={dialog.input.type || 'text'}
                  autoComplete="new-password"
                  value={value}
                  onChange={(e) => { setValue(e.target.value); setError(''); }}
                />
                {error && <div className="confirm-error" role="alert">{error}</div>}
              </form>
            )}

            <div className="confirm-actions">
              <button type="button" ref={cancelRef} className="confirm-btn" onClick={cancel}>
                {dialog.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                ref={confirmRef}
                className={`confirm-btn ${dialog.danger ? 'danger' : 'primary'}`}
                onClick={accept}
              >
                {dialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => useContext(ConfirmContext);
