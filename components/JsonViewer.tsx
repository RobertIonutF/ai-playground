'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion } from 'framer-motion';

interface JsonViewerProps {
  data: any;
  raw?: boolean;
}

export function JsonViewer({ data, raw = false }: JsonViewerProps) {
  const content = raw 
    ? (typeof data === 'string' ? data : JSON.stringify(data))
    : (typeof data === 'string' ? data : JSON.stringify(data, null, 2));

  const isJson = typeof data === 'object' || (typeof data === 'string' && content.trim().startsWith('{'));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full h-full overflow-auto rounded-lg"
    >
      <SyntaxHighlighter
        language={isJson ? "json" : "text"}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1.5rem',
          background: 'transparent',
          fontSize: '0.875rem',
          lineHeight: '1.6',
        }}
        wrapLines={true}
        showLineNumbers={false}
      >
        {content}
      </SyntaxHighlighter>
    </motion.div>
  );
}

