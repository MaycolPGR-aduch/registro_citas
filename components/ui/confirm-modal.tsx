"use client";

import { motion } from "framer-motion";
import { FaExclamationTriangle, FaTrash, FaTimes } from "react-icons/fa";
import { Modal } from "./modal";

type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Eliminar",
  cancelText = "Cancelar",
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-rose-600">
          <FaExclamationTriangle />
          <span>{title}</span>
        </div>
      }
    >
      <div className="space-y-6">
        <p className="text-slate-600 leading-relaxed">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary flex items-center justify-center gap-2 order-2 sm:order-1"
            onClick={onClose}
            disabled={isLoading}
          >
            <FaTimes className="text-xs" />
            <span>{cancelText}</span>
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            className="btn-danger flex items-center justify-center gap-2 order-1 sm:order-2 shadow-lg shadow-rose-100"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <FaTrash className="text-xs" />
            )}
            <span>{isLoading ? "Procesando..." : confirmText}</span>
          </motion.button>
        </div>
      </div>
    </Modal>
  );
}
