'use client';

import { ApiRequest } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Trash2, Copy, CheckCircle2 } from 'lucide-react';
import { toCurl } from '@/lib/api-utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface HistorySidebarProps {
  history: ApiRequest[];
  onLoadRequest: (request: ApiRequest) => void;
  onClearHistory: () => void;
}

export function HistorySidebar({ history, onLoadRequest, onClearHistory }: HistorySidebarProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyAsCurl = async (request: ApiRequest, e: React.MouseEvent) => {
    e.stopPropagation();
    const curl = toCurl(request);
    await navigator.clipboard.writeText(curl);
    setCopiedId(request.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied as cURL!', {
      description: 'Command copied to clipboard'
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-emerald-500',
      POST: 'bg-cyan-500',
      PUT: 'bg-amber-500',
      DELETE: 'bg-rose-500',
      PATCH: 'bg-purple-500',
      HEAD: 'bg-gray-500',
      OPTIONS: 'bg-blue-500',
    };
    return colors[method] || 'bg-gray-500';
  };

  return (
    <Card className="h-full flex flex-col border-0 shadow-none bg-transparent">
      <CardHeader>
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <CardTitle className="text-lg flex items-center gap-2 font-bold">
            <Clock className="w-5 h-5 text-cyan-500" />
            <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
              History
            </span>
            {history.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-xs font-normal px-2 py-0.5 bg-cyan-500/10 text-cyan-500 rounded-full"
              >
                {history.length}
              </motion.span>
            )}
          </CardTitle>
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Button
                onClick={onClearHistory}
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-rose-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      </CardHeader>
      <Separator className="bg-border/50" />
      <CardContent className="flex-1 overflow-auto p-0">
        {history.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center h-full text-muted-foreground px-4 text-center"
          >
            <div>
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-6xl mb-4"
              >
                📋
              </motion.div>
              <p className="text-sm font-medium mb-1">No requests yet</p>
              <p className="text-xs">Your request history will appear here</p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-2 p-3">
            <AnimatePresence>
              {history.map((req, index) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="group p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-accent/50 hover:border-cyan-500/30 cursor-pointer transition-all backdrop-blur-sm shadow-sm hover:shadow-md"
                  onClick={() => onLoadRequest(req)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`${getMethodColor(req.method)} text-white text-xs font-semibold shadow-sm`}>
                          {req.method}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(req.timestamp)}
                        </span>
                      </div>
                      {req.name && (
                        <p className="text-sm font-semibold truncate text-foreground">
                          {req.name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground truncate font-mono">
                        {req.url}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-all h-7 w-7 p-0 hover:bg-cyan-500/10 hover:text-cyan-500"
                      onClick={(e) => copyAsCurl(req, e)}
                      title="Copy as cURL"
                    >
                      {copiedId === req.id ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

