import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

/* ─── Button ─────────────────────────────────────────── */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const variantClass = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    success: 'btn-success',
    outline: 'btn-outline',
  }[variant] || 'btn-primary';

  const sizeClass = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  }[size] || '';

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 size={18} className="spinner" />}
      {children}
    </button>
  );
};

/* ─── Card ───────────────────────────────────────────── */
export const Card = ({ children, className = '', variant = '', ...props }) => {
  return (
    <div className={`card ${variant ? `card-${variant}` : ''} ${className}`} {...props}>
      {children}
    </div>
  );
};

/* ─── Input ──────────────────────────────────────────── */
export const Input = ({ label, id, error, className = '', suffix, ...props }) => {
  return (
    <div className={`input-group ${className}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      <div style={{ position: 'relative' }}>
        <input 
          id={id} 
          className={`input-field ${error ? 'input-error' : ''} ${suffix ? 'has-suffix' : ''}`} 
          style={suffix ? { paddingLeft: '40px' } : {}}
          {...props} 
        />
        {suffix && (
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            {suffix}
          </div>
        )}
      </div>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
};

/* ─── Textarea ───────────────────────────────────────── */
export const Textarea = ({ label, id, error, className = '', ...props }) => {
  return (
    <div className={`input-group ${className}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      <textarea id={id} className={`input-field textarea ${error ? 'input-error' : ''}`} {...props} />
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
};

/* ─── Select ─────────────────────────────────────────── */
export const Select = ({ label, id, options = [], error, className = '', ...props }) => {
  return (
    <div className={`input-group ${className}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      <select id={id} className={`input-field select-field ${error ? 'input-error' : ''}`} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
};

/* ─── Badge ──────────────────────────────────────────── */
export const Badge = ({ children, variant = 'default', className = '' }) => {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
};

/* ─── Spinner ────────────────────────────────────────── */
export const Spinner = ({ size = 24, className = '' }) => {
  return (
    <div className={`flex justify-center items-center ${className}`} style={{ padding: '40px' }}>
      <Loader2 size={size} className="spinner" style={{ color: 'var(--brand-primary)' }} />
    </div>
  );
};

/* ─── EmptyState ─────────────────────────────────────── */
export const EmptyState = ({ icon, title, description, action }) => {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  );
};

/* ─── StatCard ───────────────────────────────────────── */
export const StatCard = ({ icon, label, value, color }) => {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ backgroundColor: `${color}18`, color }}>
        {icon}
      </div>
      <div>
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
      </div>
    </div>
  );
};

/* ─── Modal ──────────────────────────────────────────── */
export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal modal-${size} animate-scale-in`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="إغلاق">&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
