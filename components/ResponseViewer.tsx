'use client';

import { ApiRequest, ApiResponse, InterpreterInput, InterpreterResult, AutoTypeRequest, AutoTypeResult, TypeLanguage, TypeStyle } from '@/types/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBytes, formatResponseTime, prettyJson, parseHeaders } from '@/lib/api-utils';
import { Copy, Download, CheckCircle2, Clock, HardDrive, Zap, Sparkles, Loader2, Code2 } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { JsonViewer } from './JsonViewer';
import { LoadingSkeleton } from './LoadingSkeleton';
import { AiExplanationView } from './AiExplanationView';
import { TypeGeneratorView } from './TypeGeneratorView';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface ResponseViewerProps {
  response: ApiResponse | null;
  isLoading?: boolean;
  currentRequest?: ApiRequest;
  onLoadSuggestion?: (method: string, url: string) => void;
}

export function ResponseViewer({ response, isLoading, currentRequest, onLoadSuggestion }: ResponseViewerProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<InterpreterResult | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  
  // Type generation state
  const [generatedTypes, setGeneratedTypes] = useState<AutoTypeResult | null>(null);
  const [isGeneratingTypes, setIsGeneratingTypes] = useState(false);
  const [typeGenerationError, setTypeGenerationError] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadResponse = () => {
    if (!response) return;
    
    const blob = new Blob([prettyJson(response.data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const explainWithAI = async () => {
    if (!response || !currentRequest) return;

    setIsExplaining(true);
    setExplainError(null);

    try {
      const interpreterInput: InterpreterInput = {
        request: {
          method: currentRequest.method,
          url: currentRequest.url,
          headers: parseHeaders(currentRequest.headers),
          body: currentRequest.body ? JSON.parse(currentRequest.body) : undefined,
        },
        response: {
          status: response.status,
          durationMs: response.responseTime,
          headers: response.headers,
          body: response.data,
          sizeBytes: response.size,
        },
        context: {
          apiLabel: 'API Playground',
          userLocale: 'en',
        },
      };

      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interpreterInput),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to get AI explanation');
      }

      const result: InterpreterResult = await res.json();
      setAiExplanation(result);
      
      if ((result as any)._cached) {
        toast.info('Cached result', { description: 'Using cached AI explanation' });
      } else {
        toast.success('AI explanation ready!', { description: 'Response analyzed successfully' });
      }
    } catch (error: any) {
      console.error('AI explanation error:', error);
      setExplainError(error.message || 'Failed to get AI explanation');
      toast.error('AI explanation failed', { 
        description: error.message || 'Please try again later'
      });
    } finally {
      setIsExplaining(false);
    }
  };

  const handleLoadSuggestion = (method: string, path: string) => {
    if (onLoadSuggestion) {
      // Extract base URL from current request
      try {
        const currentUrl = new URL(currentRequest?.url || '');
        const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;
        const fullUrl = path.startsWith('http') ? path : `${baseUrl}${path}`;
        onLoadSuggestion(method, fullUrl);
        toast.success('Request loaded!', { description: 'Suggestion loaded into editor' });
      } catch {
        toast.error('Invalid URL', { description: 'Could not construct URL from suggestion' });
      }
    }
  };

  const handleGenerateTypes = async (language: TypeLanguage, style: TypeStyle) => {
    if (!response) return;

    setIsGeneratingTypes(true);
    setTypeGenerationError(null);

    try {
      const typeRequest: AutoTypeRequest = {
        responseBody: response.data,
        language,
        style
      };

      const res = await fetch('/api/ai/generate-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(typeRequest),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate types');
      }

      const result: AutoTypeResult = await res.json();
      setGeneratedTypes(result);
      
      if ((result as any)._cached) {
        toast.info('Cached result', { description: 'Using cached type generation' });
      } else {
        toast.success('Types generated!', { description: 'Type definitions created successfully' });
      }
    } catch (error: any) {
      console.error('Type generation error:', error);
      setTypeGenerationError(error.message || 'Failed to generate types');
      toast.error('Type generation failed', { 
        description: error.message || 'Please try again later'
      });
    } finally {
      setIsGeneratingTypes(false);
    }
  };


  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!response) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-4 p-8"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1
            }}
            className="text-7xl mb-4"
          >
            🚀
          </motion.div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
            Ready to Play
          </h3>
          <p className="text-muted-foreground text-base max-w-md">
            Enter a URL and hit <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Send</kbd> to see the magic happen
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4">
            <Zap className="w-4 h-4 text-cyan-500" />
            <span>Lightning fast • Beautiful responses • Zero setup</span>
          </div>
        </motion.div>
      </div>
    );
  }

  const prettyResponse = typeof response.data === 'string' 
    ? response.data 
    : prettyJson(response.data);

  const rawResponse = typeof response.data === 'string'
    ? response.data
    : JSON.stringify(response.data);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      {/* Status Bar */}
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <StatusBadge
                status={response.status}
                statusText={response.statusText}
              />
              
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 text-cyan-500" />
                <span className="font-medium">{formatResponseTime(response.responseTime)}</span>
              </div>
              
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <HardDrive className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{formatBytes(response.size)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(prettyResponse, 'response')}
                className="hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all"
              >
                {copied === 'response' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1.5" />
                    Copy
                  </>
                )}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={downloadResponse}
                className="hover:bg-blue-500/10 hover:border-blue-500/50 transition-all"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Response Content Tabs */}
      <Tabs defaultValue="pretty" className="flex-1 flex flex-col">
        <TabsList className="mx-6">
          <TabsTrigger value="pretty" className="data-[state=active]:bg-cyan-500/10">
            Pretty
          </TabsTrigger>
          <TabsTrigger value="raw" className="data-[state=active]:bg-blue-500/10">
            Raw
          </TabsTrigger>
          <TabsTrigger value="headers" className="data-[state=active]:bg-purple-500/10">
            Headers
          </TabsTrigger>
          <TabsTrigger value="types" className="data-[state=active]:bg-indigo-500/10">
            <Code2 className="w-4 h-4 mr-1.5" />
            Types
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-pink-500/10">
            <Sparkles className="w-4 h-4 mr-1.5" />
            AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pretty" className="flex-1 px-6 mt-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Card className="h-full border-cyan-500/20 bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="h-full overflow-auto">
                <CardContent className="p-0">
                  <JsonViewer data={response.data} />
                </CardContent>
              </div>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="raw" className="flex-1 px-6 mt-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Card className="h-full border-blue-500/20 bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="h-full overflow-auto">
                <CardContent className="p-0">
                  <JsonViewer data={response.data} raw />
                </CardContent>
              </div>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="headers" className="flex-1 px-6 mt-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Card className="h-full border-purple-500/20 bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="h-full overflow-auto">
                <CardContent className="p-4">
                {Object.keys(response.headers).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="text-4xl mb-3">📦</div>
                    <p>No response headers available.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(response.headers).map(([key, value], i) => (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-cyan-500 break-words">
                            {key}
                          </div>
                          <div 
                            className="text-sm font-mono text-muted-foreground break-all whitespace-pre-wrap leading-relaxed"
                            style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                          >
                            {value}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                </CardContent>
              </div>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="types" className="flex-1 px-6 mt-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full overflow-auto"
          >
            <TypeGeneratorView
              responseData={response.data}
              onGenerateTypes={handleGenerateTypes}
              isGenerating={isGeneratingTypes}
              generatedTypes={generatedTypes}
              error={typeGenerationError}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="ai" className="flex-1 px-6 mt-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full overflow-auto"
          >
              {!aiExplanation && !isExplaining && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 p-8 max-w-md">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 1
                    }}
                    className="text-7xl mb-4"
                  >
                    ✨
                  </motion.div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                    AI Response Interpreter
                  </h3>
                  <p className="text-muted-foreground text-base">
                    Get an AI-powered summary, key facts, and suggested next steps for this API response.
                  </p>
                  <Button
                    onClick={explainWithAI}
                    disabled={!currentRequest}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 mt-4"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Explain with AI
                  </Button>
                  {explainError && (
                    <p className="text-sm text-destructive mt-2">
                      {explainError}
                    </p>
                  )}
                </div>
              </div>
            )}

            {isExplaining && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 p-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-12 h-12 text-purple-500 mx-auto" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-foreground">
                    Analyzing response...
                  </h3>
                  <p className="text-muted-foreground">
                    AI is processing your API response
                  </p>
                </div>
              </div>
            )}

              {aiExplanation && !isExplaining && (
                <AiExplanationView 
                  result={aiExplanation} 
                  onLoadSuggestion={handleLoadSuggestion}
                />
              )}
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

