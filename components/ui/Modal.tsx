
import React, { ReactNode } from 'react';
import { CloseIcon } from '../icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 border border-gray-700 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (fixed) */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content (scrollable) */}
        <div className="overflow-y-auto p-6">
            {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
