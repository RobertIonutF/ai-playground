'use client';

import { motion } from 'framer-motion';

export function LoadingSkeleton() {
  return (
    <div className="flex flex-col h-full p-6 space-y-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        {/* Status bar skeleton */}
        <div className="flex items-center gap-4">
          <div className="h-8 w-32 bg-gradient-to-r from-muted/50 to-muted/30 rounded-full animate-pulse" />
          <div className="h-4 w-20 bg-gradient-to-r from-muted/50 to-muted/30 rounded animate-pulse" />
          <div className="h-4 w-20 bg-gradient-to-r from-muted/50 to-muted/30 rounded animate-pulse" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-3 pt-4">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-2"
            >
              <div 
                className="h-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded animate-pulse"
                style={{ width: `${Math.random() * 40 + 60}%` }}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

