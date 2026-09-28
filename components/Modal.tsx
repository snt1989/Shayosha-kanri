'use client';

import { ReactNode } from 'react';

export default function Modal({
  title,
  onClose,
  children,
  footer,
  tone,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  tone?: 'dark';
  wide?: boolean | 'x';
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-box${wide === 'x' ? ' modal-box-xwide' : wide ? ' modal-box-wide' : ''}`}>
        <div className={`modal-header${tone === 'dark' ? ' modal-header-dark' : ''}`}>
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
