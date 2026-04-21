"use client";

import { motion } from "framer-motion";
import { FaExclamationCircle } from "react-icons/fa";

type ErrorMessageProps = {
  message: string;
};

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -20 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, y: -20 }}
      className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3 text-sm text-rose-800 backdrop-blur-sm shadow-sm shadow-rose-100/50"
    >
      <FaExclamationCircle className="text-rose-500 shrink-0" />
      <span className="font-medium">{message}</span>
    </motion.div>
  );
}
