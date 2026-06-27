import React from 'react';
import useConfirmStore from '../../store/useConfirmStore';
import ConfirmModal from './ConfirmModal';

export default function GlobalConfirmModal() {
  const { 
    isOpen, 
    title, 
    message, 
    confirmText, 
    cancelText, 
    variant, 
    onConfirm, 
    onCancel 
  } = useConfirmStore();

  return (
    <ConfirmModal
      isOpen={isOpen}
      title={title}
      message={message}
      confirmText={confirmText}
      cancelText={cancelText}
      variant={variant}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
