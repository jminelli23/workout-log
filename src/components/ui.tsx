import type { ReactNode } from 'react';
import { Chevron, IconBack } from './Icons';

export function NavBar({
  title,
  back,
  onBack,
  right,
  left,
}: {
  title?: string;
  back?: string;
  onBack?: () => void;
  right?: ReactNode;
  left?: ReactNode;
}) {
  return (
    <header className="navbar">
      <div className="navbar-row">
        <div className="navbar-left">
          {onBack ? (
            <button className="nav-btn" onClick={onBack}>
              <IconBack /> <span style={{ marginLeft: 4 }}>{back ?? 'Back'}</span>
            </button>
          ) : (
            left
          )}
        </div>
        <div className="navbar-title">{title}</div>
        <div className="navbar-right">{right}</div>
      </div>
    </header>
  );
}

export function Section({
  header,
  footer,
  children,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {header && <div className="section-header" style={{ margin: '16px 16px 0' }}>{header}</div>}
      <div className="section">
        <div className="list">{children}</div>
        {footer && <div className="section-footer">{footer}</div>}
      </div>
    </>
  );
}

export function LinkRow({
  title,
  sub,
  value,
  onClick,
}: {
  title: ReactNode;
  sub?: ReactNode;
  value?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="row" onClick={onClick}>
      <div className="row-main">
        <div className="row-title">{title}</div>
        {sub && <div className="row-sub">{sub}</div>}
      </div>
      {value != null && <span className="row-value">{value}</span>}
      <Chevron />
    </button>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}) {
  return (
    <div className="stepper">
      <button aria-label="Decrease" disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>
        −
      </button>
      <span className="divider" />
      <span className="val">{format ? format(value) : value}</span>
      <span className="divider" />
      <button aria-label="Increase" disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>
        +
      </button>
    </div>
  );
}

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <div className="screen placeholder-screen">
      <h1 className="large-title">{title}</h1>
      <div className="empty">
        <p>{text}</p>
      </div>
    </div>
  );
}
