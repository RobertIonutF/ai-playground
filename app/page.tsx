'use client';

import { useState } from 'react';
import { ApiRequest, ApiResponse, ConversationSession, ApiContext, ApiEndpoint } from '@/types/api';
import { RequestEditor } from '@/components/RequestEditor';
import { ResponseViewer } from '@/components/ResponseViewer';
import { HistorySidebar } from '@/components/HistorySidebar';
import { ApiContextLoader } from '@/components/ApiContextLoader';
import { ApiKnowledgeViewer } from '@/components/ApiKnowledgeViewer';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useConversationSession } from '@/hooks/useConversationSession';
import { useApiContext } from '@/hooks/useApiContext';
import { generateId, parseHeaders } from '@/lib/api-utils';
import { apiRequestToConversationRequest } from '@/lib/conversation-utils';
import { Button } from '@/components/ui/button';
import { Menu, X, Copy, Save, Sparkles, MessageSquare, BookOpen, Library } from 'lucide-react';
import { toCurl } from '@/lib/api-utils';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_HISTORY = 50;

export default function Home() {
  const [history, setHistory, historyLoaded] = useLocalStorage<ApiRequest[]>('api-playground-history', []);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [mode, setMode] = useState<'manual' | 'conversation'>('manual');
  const [baseUrl, setBaseUrl] = useLocalStorage<string>('api-playground-base-url', '');
  const [showContextLoader, setShowContextLoader] = useState(false);
  const [showEndpointBrowser, setShowEndpointBrowser] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  // Load API context
  const { context: apiContext, updateContext: updateApiContext, hasContext } = useApiContext();
  
  // Initialize conversation session with base URL
  const {
    session: conversationSession,
    updateSession: updateConversationSession,
    clearSession: clearConversationSession,
    createNewSession: createNewConversationSession,
    isLoaded: conversationLoaded
  } = useConversationSession(baseUrl);

  const [currentRequest, setCurrentRequest] = useState<ApiRequest>({
    id: generateId(),
    name: '',
    method: 'GET',
    url: '',
    headers: [],
    body: '',
    bodyType: 'json',
    timestamp: Date.now(),
  });

  const sendRequest = async () => {
    if (!currentRequest.url) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const headers = parseHeaders(currentRequest.headers);
      
      const requestPayload = {
        method: currentRequest.method,
        url: currentRequest.url,
        headers,
        body: currentRequest.bodyType !== 'none' ? currentRequest.body : null,
      };

      const res = await fetch('/api/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      const data: ApiResponse = await res.json();
      setResponse(data);

      // Add to history
      const requestToSave = {
        ...currentRequest,
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        const newHistory = [requestToSave, ...prev];
        return newHistory.slice(0, MAX_HISTORY);
      });

      // Update conversation context if in conversation mode
      if (mode === 'conversation' && conversationSession) {
        const conversationRequest = apiRequestToConversationRequest(currentRequest);
        const updatedSession = {
          ...conversationSession,
          context: {
            ...conversationSession.context,
            previousRequests: [
              conversationRequest,
              ...conversationSession.context.previousRequests
            ].slice(0, 5), // Keep last 5 requests
          },
          updatedAt: Date.now(),
        };
        updateConversationSession(updatedSession);
      }

    } catch (error: any) {
      setResponse({
        status: 0,
        statusText: 'Request Failed',
        headers: {},
        data: { error: error.message || 'An error occurred' },
        responseTime: 0,
        size: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRequest = (request: ApiRequest) => {
    setCurrentRequest({
      ...request,
      id: generateId(),
      timestamp: Date.now(),
    });
    setResponse(null);
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      setHistory([]);
    }
  };

  const saveRequest = () => {
    const requestToSave = {
      ...currentRequest,
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      // Check if a request with same URL and method already exists
      const existingIndex = prev.findIndex(
        r => r.url === requestToSave.url && r.method === requestToSave.method
      );

      if (existingIndex >= 0) {
        // Update existing
        const newHistory = [...prev];
        newHistory[existingIndex] = requestToSave;
        toast.success('Request updated!', {
          description: 'Existing request has been updated in history'
        });
        return newHistory;
      }

      // Add new
      toast.success('Request saved!', {
        description: 'Added to history sidebar'
      });
      return [requestToSave, ...prev].slice(0, MAX_HISTORY);
    });
  };

  const copyAsCurl = async () => {
    const curl = toCurl(currentRequest);
    await navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
    toast.success('Copied as cURL!', {
      description: 'Command copied to clipboard'
    });
  };

  const handleLoadSuggestion = (method: string, url: string) => {
    setCurrentRequest({
      ...currentRequest,
      method: method as any,
      url: url,
      id: generateId(),
      timestamp: Date.now(),
    });
    setResponse(null);
  };

  const handleBaseUrlChange = (newBaseUrl: string) => {
    setBaseUrl(newBaseUrl);
    // Update conversation session with new base URL
    if (conversationSession && newBaseUrl !== conversationSession.context.baseUrl) {
      const updatedSession = {
        ...conversationSession,
        context: {
          ...conversationSession.context,
          baseUrl: newBaseUrl,
        },
        updatedAt: Date.now(),
      };
      updateConversationSession(updatedSession);
    }
  };

  const handleContextLoaded = (context: ApiContext) => {
    updateApiContext(context);
    setBaseUrl(context.baseUrl);
    setShowContextLoader(false);
    toast.success('API Context Loaded!', {
      description: `${context.endpoints.length} endpoints from ${context.name}`,
    });
  };

  const handleSelectEndpoint = (endpoint: ApiEndpoint) => {
    // Build full URL from base URL and endpoint path
    const fullUrl = apiContext ? `${apiContext.baseUrl}${endpoint.path}` : endpoint.path;
    
    // Update current request with endpoint details
    const newRequest: ApiRequest = {
      ...currentRequest,
      method: endpoint.method,
      url: fullUrl,
      id: generateId(),
      timestamp: Date.now(),
      name: endpoint.summary || `${endpoint.method} ${endpoint.path}`,
    };

    // Add required parameters as headers if specified
    if (endpoint.parameters) {
      const headerParams = endpoint.parameters.filter(p => p.in === 'header' && p.required);
      if (headerParams.length > 0) {
        newRequest.headers = [
          ...currentRequest.headers,
          ...headerParams.map(p => ({
            id: generateId(),
            key: p.name,
            value: '',
            enabled: true,
          }))
        ];
      }
    }

    setCurrentRequest(newRequest);
    setShowEndpointBrowser(false);
    
    toast.success('Endpoint Loaded!', {
      description: `${endpoint.method} ${endpoint.path}`,
    });
  };

  const handleModeChange = (newMode: 'manual' | 'conversation') => {
    setMode(newMode);
    if (newMode === 'conversation' && !conversationSession) {
      createNewConversationSession(baseUrl);
    }
  };

  const handleClearConversationSession = () => {
    clearConversationSession();
    toast.success('Conversation cleared!', {
      description: 'Started a new conversation session'
    });
  };

  const handleRequestExecuted = (request: any, apiResponse: any) => {
    // Update the response state with the executed request result
    setResponse(apiResponse);
    
    // Also update the current request to show what was executed
    const executedRequest: ApiRequest = {
      id: generateId(),
      name: `AI Generated: ${request.method} ${new URL(request.url).pathname}`,
      method: request.method,
      url: request.url,
      headers: Object.entries(request.headers || {}).map(([key, value]) => ({
        id: generateId(),
        key,
        value: value as string,
        enabled: true
      })),
      body: request.body ? JSON.stringify(request.body, null, 2) : '',
      bodyType: request.body ? 'json' : 'none',
      timestamp: Date.now(),
    };
    
    setCurrentRequest(executedRequest);
    
    // Add to history
    setHistory((prev) => {
      const newHistory = [executedRequest, ...prev];
      return newHistory.slice(0, MAX_HISTORY);
    });
  };

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col h-screen bg-background"
      >
        {/* Header */}
        <header className="border-b bg-gradient-to-r from-card/80 via-card/50 to-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden hover:bg-cyan-500/10 transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Sparkles className="w-6 h-6 text-cyan-500" />
                  </motion.div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                      API Playground
                    </h1>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">Play with APIs, not with complexity</p>
                      {mode === 'conversation' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full border border-purple-500/20">
                          <MessageSquare className="w-3 h-3 text-purple-500" />
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">AI Mode</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex gap-2 items-center"
            >
              {/* API Context Indicator */}
              {hasContext && apiContext && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                  <Library className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {apiContext.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEndpointBrowser(true)}
                    className="h-6 px-2 text-xs"
                  >
                    <BookOpen className="w-3 h-3 mr-1" />
                    Browse
                  </Button>
                </div>
              )}
              
              <Button
                variant={hasContext ? "outline" : "default"}
                size="sm"
                onClick={() => setShowContextLoader(true)}
                className={hasContext 
                  ? "hover:bg-emerald-500/10 hover:border-emerald-500/50" 
                  : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                }
              >
                <Library className="w-4 h-4 mr-2" />
                {hasContext ? 'Change API' : 'Load API Docs'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={copyAsCurl}
                disabled={!currentRequest.url}
                className="hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all"
              >
                {copiedCurl ? (
                  <>
                    <Copy className="w-4 h-4 mr-2 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy as cURL
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={saveRequest}
                disabled={!currentRequest.url}
                className="hover:bg-blue-500/10 hover:border-blue-500/50 transition-all"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </motion.div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <motion.aside
            initial={{ x: -300 }}
            animate={{ 
              x: (sidebarOpen || isDesktop) ? 0 : -300,
              width: (sidebarOpen || isDesktop) ? 320 : 0
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="border-r bg-gradient-to-b from-card/50 to-card/30 backdrop-blur-sm overflow-hidden shadow-lg"
          >
            <HistorySidebar
              history={history}
              onLoadRequest={loadRequest}
              onClearHistory={clearHistory}
            />
          </motion.aside>

          {/* Main Split View */}
          <main className="flex-1 grid lg:grid-cols-2 overflow-hidden">
            {/* Request Panel */}
            <div className="border-r overflow-hidden bg-gradient-to-br from-background to-muted/10">
              <RequestEditor
                request={currentRequest}
                onChange={setCurrentRequest}
                onSend={sendRequest}
                isLoading={isLoading}
                conversationSession={conversationSession}
                onConversationSessionUpdate={updateConversationSession}
                onClearConversationSession={handleClearConversationSession}
                onRequestExecuted={handleRequestExecuted}
                mode={mode}
                onModeChange={handleModeChange}
                baseUrl={baseUrl}
                onBaseUrlChange={handleBaseUrlChange}
              />
            </div>

            {/* Response Panel */}
            <div className="overflow-hidden bg-gradient-to-bl from-background to-muted/10">
              <ResponseViewer 
                response={response} 
                isLoading={isLoading}
                currentRequest={currentRequest}
                onLoadSuggestion={handleLoadSuggestion}
              />
            </div>
          </main>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {/* Context Loader Modal */}
          {showContextLoader && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowContextLoader(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ApiContextLoader
                  onContextLoaded={handleContextLoaded}
                  onClose={() => setShowContextLoader(false)}
                />
              </motion.div>
            </motion.div>
          )}

          {/* Endpoint Browser Modal */}
          {showEndpointBrowser && apiContext && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowEndpointBrowser(false)}
            >
              <motion.div
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className="w-full max-w-3xl h-[80vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <ApiKnowledgeViewer
                  context={apiContext}
                  onSelectEndpoint={handleSelectEndpoint}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.footer 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="border-t bg-gradient-to-r from-card/80 via-card/50 to-card/80 backdrop-blur-md px-6 py-3 shadow-sm"
        >
          <div className="flex items-center justify-between text-sm text-muted-foreground flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5">
                Made with <span className="text-rose-500 animate-pulse">❤️</span> by 
                <span className="font-semibold text-foreground">Fundulea Robert Ionuț</span>
              </span>
              <span className="hidden sm:inline text-cyan-500">•</span>
              <kbd className="hidden sm:inline px-2 py-0.5 bg-muted rounded text-xs font-mono border border-border">
                Ctrl/Cmd + Enter
              </kbd>
              <span className="hidden sm:inline text-xs">to send</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-1 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded border border-cyan-500/20">
                v1.1.0 + AI
              </span>
              {mode === 'conversation' && (
                <span className="font-mono text-xs px-2 py-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded border border-purple-500/20 text-purple-600 dark:text-purple-400">
                  🤖 Conversation Mode
                </span>
              )}
            </div>
          </div>
        </motion.footer>
      </motion.div>
    </>
  );
}
