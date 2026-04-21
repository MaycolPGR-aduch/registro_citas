"use client";

import { motion } from "framer-motion";
import { FaCheckCircle } from "react-icons/fa";

type SuccessMessageProps = {
  message: string;
};

export function SuccessMessage({ message }: SuccessMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -20 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, y: -20 }}
      className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-800 backdrop-blur-sm shadow-sm shadow-emerald-100/50"
    >
      <FaCheckCircle className="text-emerald-500 shrink-0" />
      <span className="font-medium">{message}</span>
    </motion.div>
  );
}
