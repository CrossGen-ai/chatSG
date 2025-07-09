import React from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, className = '' }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div 
      className={`fixed inset-0 flex items-center justify-center p-4 ${className}`}
      style={{ 
        zIndex: 2147483647, // Maximum z-index value
        isolation: 'isolate', // Create new stacking context
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>,
    document.body
  );
};