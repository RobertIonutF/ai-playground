'use client';

import { ApiRequest, Header, HttpMethod, ConversationSession, ConversationRequest } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { generateId } from '@/lib/api-utils';
import { Plus, Trash2, Send, Sparkles, Tag, MessageSquare, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConversationPanel } from '@/components/ConversationPanel';
import { conversationRequestToApiRequest, updateSessionContext } from '@/lib/conversation-utils';

interface RequestEditorProps {
  request: ApiRequest;
  onChange: (request: ApiRequest) => void;
  onSend: () => void;
  isLoading: boolean;
  conversationSession?: ConversationSession;
  onConversationSessionUpdate?: (session: ConversationSession) => void;
  onClearConversationSession?: () => void;
  onRequestExecuted?: (request: ConversationRequest, response: any) => void;
  mode?: 'manual' | 'conversation';
  onModeChange?: (mode: 'manual' | 'conversation') => void;
  baseUrl?: string;
  onBaseUrlChange?: (baseUrl: string) => void;
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-emerald-500 hover:bg-emerald-600',
  POST: 'bg-cyan-500 hover:bg-cyan-600',
  PUT: 'bg-amber-500 hover:bg-amber-600',
  DELETE: 'bg-rose-500 hover:bg-rose-600',
  PATCH: 'bg-purple-500 hover:bg-purple-600',
  HEAD: 'bg-gray-500 hover:bg-gray-600',
  OPTIONS: 'bg-blue-500 hover:bg-blue-600',
};

export function RequestEditor({ 
  request, 
  onChange, 
  onSend, 
  isLoading,
  conversationSession,
  onConversationSessionUpdate,
  onClearConversationSession,
  onRequestExecuted,
  mode = 'manual',
  onModeChange,
  baseUrl,
  onBaseUrlChange
}: RequestEditorProps) {
  const updateRequest = (updates: Partial<ApiRequest>) => {
    onChange({ ...request, ...updates });
  };

  const addHeader = () => {
    const newHeader: Header = {
      id: generateId(),
      key: '',
      value: '',
      enabled: true,
    };
    updateRequest({ headers: [...request.headers, newHeader] });
  };

  const updateHeader = (id: string, updates: Partial<Header>) => {
    const updatedHeaders = request.headers.map(h =>
      h.id === id ? { ...h, ...updates } : h
    );
    updateRequest({ headers: updatedHeaders });
  };

  const deleteHeader = (id: string) => {
    updateRequest({ headers: request.headers.filter(h => h.id !== id) });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      onSend();
    }
  };

  const handleRequestGenerated = (conversationRequest: ConversationRequest, explanation: string) => {
    // Convert conversation request to API request format
    const apiRequest = conversationRequestToApiRequest(conversationRequest, `AI: ${explanation.substring(0, 50)}...`);
    onChange(apiRequest);
    
    // Update session context with the new request
    if (conversationSession && onConversationSessionUpdate) {
      const updatedSession = updateSessionContext(conversationSession, conversationRequest);
      onConversationSessionUpdate(updatedSession);
    }
  };

  const toggleMode = () => {
    const newMode = mode === 'manual' ? 'conversation' : 'manual';
    onModeChange?.(newMode);
  };

  // If conversation mode is active and no conversation session is provided, we can't render
  if (mode === 'conversation' && !conversationSession) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div className="space-y-4">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold text-muted-foreground">Conversation Mode Unavailable</h3>
          <p className="text-sm text-muted-foreground">Switch to manual mode or initialize conversation session.</p>
          <Button onClick={toggleMode} variant="outline">
            Switch to Manual Mode
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      {/* Mode Toggle and Settings */}
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="pt-4 pb-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={mode === 'manual' ? 'default' : 'outline'}
                onClick={() => onModeChange?.('manual')}
                className="h-8"
              >
                <Settings className="w-4 h-4 mr-1.5" />
                Manual
              </Button>
              <Button
                size="sm"
                variant={mode === 'conversation' ? 'default' : 'outline'}
                onClick={() => onModeChange?.('conversation')}
                className={`h-8 ${mode === 'conversation' ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' : ''}`}
              >
                <MessageSquare className="w-4 h-4 mr-1.5" />
                Conversation
              </Button>
            </div>
            
            {/* Base URL Setting */}
            {onBaseUrlChange && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Base URL:</label>
                <Input
                  value={baseUrl || ''}
                  onChange={(e) => onBaseUrlChange(e.target.value)}
                  placeholder="https://api.example.com"
                  className="w-48 h-8 text-xs"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Render conversation panel or manual editor based on mode */}
      {mode === 'conversation' && conversationSession && onConversationSessionUpdate && onClearConversationSession ? (
        <div className="flex-1 overflow-hidden">
          <ConversationPanel
            session={conversationSession}
            onSessionUpdate={onConversationSessionUpdate}
            onRequestGenerated={handleRequestGenerated}
            onRequestExecuted={onRequestExecuted}
            onClearSession={onClearConversationSession}
            isLoading={isLoading}
            baseUrl={baseUrl}
          />
        </div>
      ) : (
        <>
          {/* Method and URL */}
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="pt-6 pb-4 space-y-4">
          <div className="flex gap-2">
            <Select
              value={request.method}
              onValueChange={(value) => updateRequest({ method: value as HttpMethod })}
            >
              <SelectTrigger className="w-32 font-semibold border-2 hover:border-cyan-500/50 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map((method) => (
                  <SelectItem key={method} value={method} className="font-semibold">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      {method}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="https://api.example.com/endpoint"
              value={request.url}
              onChange={(e) => updateRequest({ url: e.target.value })}
              onKeyDown={handleKeyPress}
              className="flex-1 border-2 hover:border-cyan-500/50 focus:border-cyan-500 transition-colors"
            />

            <Button
              onClick={onSend}
              disabled={!request.url || isLoading}
              className={`${METHOD_COLORS[request.method]} text-white min-w-28 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50`}
            >
              {isLoading ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2"
                >
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    ⏳
                  </motion.span>
                  Sending
                </motion.span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Send
                </span>
              )}
            </Button>
          </div>

          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Request Name (optional)"
              value={request.name}
              onChange={(e) => updateRequest({ name: e.target.value })}
              className="text-sm pl-10 border-2 hover:border-blue-500/50 focus:border-blue-500 transition-colors"
            />
          </div>
        </CardContent>
      </Card>

      {/* Headers and Body Tabs */}
      <Tabs defaultValue="headers" className="flex-1 flex flex-col">
        <TabsList className="mx-6">
          <TabsTrigger value="headers" className="data-[state=active]:bg-cyan-500/10">
            Headers
          </TabsTrigger>
          <TabsTrigger value="body" className="data-[state=active]:bg-blue-500/10">
            Body
          </TabsTrigger>
        </TabsList>

        <TabsContent value="headers" className="flex-1 overflow-auto px-6">
          <Card className="border-cyan-500/20 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span className="text-lg">🎫</span>
                  Request Headers
                </CardTitle>
                <Button 
                  onClick={addHeader} 
                  size="sm" 
                  variant="outline"
                  className="hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Header
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {request.headers.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="text-5xl mb-3">📨</div>
                  <p className="text-sm">No headers added yet.</p>
                  <p className="text-xs mt-1">Click "Add Header" to get started.</p>
                </motion.div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 font-semibold">On</TableHead>
                      <TableHead className="font-semibold">Key</TableHead>
                      <TableHead className="font-semibold">Value</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {request.headers.map((header, index) => (
                        <motion.tr
                          key={header.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-border/50 hover:bg-muted/50"
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={header.enabled}
                              onChange={(e) => updateHeader(header.id, { enabled: e.target.checked })}
                              className="w-4 h-4 cursor-pointer accent-cyan-500"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={header.key}
                              onChange={(e) => updateHeader(header.id, { key: e.target.value })}
                              placeholder="Content-Type"
                              className="h-8 border-2 hover:border-cyan-500/50 focus:border-cyan-500"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={header.value}
                              onChange={(e) => updateHeader(header.id, { value: e.target.value })}
                              placeholder="application/json"
                              className="h-8 border-2 hover:border-blue-500/50 focus:border-blue-500"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => deleteHeader(header.id)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="body" className="flex-1 overflow-auto px-6">
          <Card className="h-full border-blue-500/20 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span className="text-lg">📦</span>
                  Request Body
                </CardTitle>
                <Select
                  value={request.bodyType}
                  onValueChange={(value) => updateRequest({ bodyType: value as any })}
                >
                  <SelectTrigger className="w-32 border-2 hover:border-blue-500/50 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="raw">Raw</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="h-[calc(100%-5rem)]">
              {request.bodyType === 'none' ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center h-full text-center text-muted-foreground"
                >
                  <div>
                    <div className="text-5xl mb-3">✨</div>
                    <p className="text-sm">This request does not have a body.</p>
                    <p className="text-xs mt-1">Select JSON or Raw to add content.</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full"
                >
                  <Textarea
                    value={request.body}
                    onChange={(e) => updateRequest({ body: e.target.value })}
                    placeholder={
                      request.bodyType === 'json'
                        ? '{\n  "key": "value",\n  "name": "API Playground"\n}'
                        : 'Enter request body...'
                    }
                    className="h-full font-mono text-sm resize-none border-2 hover:border-blue-500/50 focus:border-blue-500 transition-colors"
                  />
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}
    </motion.div>
  );
}

