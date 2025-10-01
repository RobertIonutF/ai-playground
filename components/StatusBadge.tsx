'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  status: number;
  statusText: string;
  isLoading?: boolean;
}

export function StatusBadge({ status, statusText, isLoading }: StatusBadgeProps) {
  const getStatusConfig = () => {
    if (isLoading) {
      return {
        color: 'bg-blue-500',
        textColor: 'text-white',
        icon: Loader2,
        label: 'Sending...',
        animation: 'animate-spin'
      };
    }

    if (status >= 200 && status < 300) {
      return {
        color: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
        textColor: 'text-white',
        icon: CheckCircle2,
        label: `${status} ${statusText}`,
        animation: ''
      };
    }
    
    if (status >= 300 && status < 400) {
      return {
        color: 'bg-gradient-to-r from-blue-500 to-blue-600',
        textColor: 'text-white',
        icon: AlertCircle,
        label: `${status} ${statusText}`,
        animation: ''
      };
    }
    
    if (status >= 400 && status < 500) {
      return {
        color: 'bg-gradient-to-r from-amber-500 to-amber-600',
        textColor: 'text-white',
        icon: AlertCircle,
        label: `${status} ${statusText}`,
        animation: ''
      };
    }
    
    return {
      color: 'bg-gradient-to-r from-rose-500 to-rose-600',
      textColor: 'text-white',
      icon: XCircle,
      label: `${status} ${statusText}`,
      animation: ''
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.color} ${config.textColor} font-semibold text-sm shadow-lg`}
    >
      <Icon className={`w-4 h-4 ${config.animation}`} />
      <span>{config.label}</span>
    </motion.div>
  );
}

