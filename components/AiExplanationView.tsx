'use client';

import { InterpreterResult } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Sparkles, AlertCircle, Lightbulb, Copy, CheckCircle2, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface AiExplanationViewProps {
  result: InterpreterResult;
  onLoadSuggestion?: (method: string, path: string) => void;
}

export function AiExplanationView({ result, onLoadSuggestion }: AiExplanationViewProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied!', { description: 'Text copied to clipboard' });
  };

  const getConfidenceBadge = () => {
    const colors = {
      high: 'bg-emerald-500 hover:bg-emerald-600',
      medium: 'bg-amber-500 hover:bg-amber-600',
      low: 'bg-gray-500 hover:bg-gray-600',
    };

    return (
      <Badge className={`${colors[result.confidence]} text-white text-xs font-semibold`}>
        {result.confidence.toUpperCase()} CONFIDENCE
      </Badge>
    );
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-emerald-500',
      POST: 'bg-cyan-500',
      PUT: 'bg-amber-500',
      DELETE: 'bg-rose-500',
      PATCH: 'bg-purple-500',
    };
    return colors[method] || 'bg-gray-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 py-2 pb-6"
    >
      {/* Summary Section */}
      <Card className="border-purple-500/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-5 h-5 text-purple-500" />
              </motion.div>
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                AI Summary
              </span>
            </CardTitle>
            {getConfidenceBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-foreground leading-relaxed break-words whitespace-pre-wrap">{result.summary}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(result.summary, 'summary')}
                className="hover:bg-purple-500/10 hover:border-purple-500/50 transition-all"
              >
                {copied === 'summary' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1.5" />
                    Copy Summary
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Facts Section */}
      {result.keyFacts.length > 0 && (
        <Card className="border-cyan-500/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="text-lg">🔑</span>
              Key Facts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.keyFacts.map((fact, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-cyan-500 break-words">
                      {fact.label}
                    </div>
                    <div className="text-sm font-mono break-all whitespace-pre-wrap leading-relaxed"
                         style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                      {fact.value}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Insight Section */}
      {result.errorInsight && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-rose-500/30 bg-rose-500/5 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-5 h-5" />
                Error Insight
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  Probable Cause
                </p>
                <p className="text-sm text-foreground break-words whitespace-pre-wrap leading-relaxed">
                  {result.errorInsight.probableCause}
                </p>
              </div>
              <Separator className="bg-rose-500/20" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  Suggested Fix
                </p>
                <p className="text-sm text-foreground break-words whitespace-pre-wrap leading-relaxed">
                  {result.errorInsight.suggestedFix}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Suggestions Section */}
      {result.suggestions.length > 0 && (
        <Card className="border-blue-500/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-500" />
              Suggested Next Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <AnimatePresence>
                {result.suggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="group p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-accent/50 hover:border-blue-500/30 cursor-pointer transition-all"
                    onClick={() => onLoadSuggestion?.(suggestion.method, suggestion.path)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${getMethodColor(suggestion.method)} text-white text-xs font-semibold`}
                          >
                            {suggestion.method}
                          </Badge>
                          <code className="text-xs font-mono text-muted-foreground break-all">
                            {suggestion.path}
                          </code>
                        </div>
                        <p className="text-sm text-foreground break-words whitespace-pre-wrap leading-relaxed">
                          {suggestion.description}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
        <Sparkles className="w-3 h-3 text-purple-500" />
        <span>Powered by AI • Analysis may not be perfect</span>
      </div>
    </motion.div>
  );
}

