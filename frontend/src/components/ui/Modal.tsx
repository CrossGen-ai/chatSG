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
    <div className={`fixed inset-0 z-[9999999] flex items-center justify-center p-4 ${className}`}>
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative">
        {children}
      </div>
    </div>,
    document.body
  );
};