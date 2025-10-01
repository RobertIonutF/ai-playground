'use client';

import { useState, useEffect, useRef } from 'react';
import { ConversationMessage, ConversationSession, ConversationResult, ConversationRequest } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  MessageSquare, 
  Bot, 
  User, 
  Play, 
  Edit, 
  Trash2, 
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  generateConversationId,
  addMessageToSession,
  exportConversationAsMarkdown,
  getConversationStats
} from '@/lib/conversation-utils';

interface ConversationPanelProps {
  session: ConversationSession;
  onSessionUpdate: (session: ConversationSession) => void;
  onRequestGenerated: (request: ConversationRequest, explanation: string) => void;
  onRequestExecuted?: (request: ConversationRequest, response: any) => void;
  onClearSession: () => void;
  isLoading?: boolean;
  baseUrl?: string;
  apiSchema?: string;
}

interface RequestPreviewProps {
  request: ConversationRequest;
  explanation: string;
  confidence: string;
  onExecute: () => void;
  onEdit: () => void;
  onDiscard: () => void;
  isGenerating?: boolean;
  isExecuting?: boolean;
}

function RequestPreview({ 
  request, 
  explanation, 
  confidence, 
  onExecute, 
  onEdit, 
  onDiscard,
  isGenerating = false,
  isExecuting = false
}: RequestPreviewProps) {
  const getConfidenceBadge = () => {
    const colors = {
      high: 'bg-emerald-500 hover:bg-emerald-600',
      medium: 'bg-amber-500 hover:bg-amber-600',
      low: 'bg-gray-500 hover:bg-gray-600',
    };

    return (
      <Badge className={`${colors[confidence as keyof typeof colors]} text-white text-xs font-semibold`}>
        {confidence.toUpperCase()}
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
      HEAD: 'bg-gray-500',
      OPTIONS: 'bg-blue-500',
    };
    return colors[method] || 'bg-gray-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="border rounded-lg p-4 space-y-4 bg-card/50 backdrop-blur-sm border-cyan-500/20"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-500" />
          <span className="text-sm font-semibold">Generated Request</span>
        </div>
        {getConfidenceBadge()}
      </div>

      {/* Request Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className={`${getMethodColor(request.method)} text-white text-xs font-bold`}>
            {request.method}
          </Badge>
          <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">
            {request.url}
          </code>
        </div>

        {/* Headers */}
        {Object.keys(request.headers).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">Headers:</h4>
            <div className="bg-muted/50 rounded p-2 text-xs font-mono">
              {Object.entries(request.headers).map(([key, value]) => (
                <div key={key} className="break-all">
                  <span className="text-cyan-500">{key}:</span> {value}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        {request.body && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">Body:</h4>
            <div className="rounded overflow-hidden">
              <SyntaxHighlighter
                language="json"
                style={oneDark}
                customStyle={{
                  margin: 0,
                  fontSize: '12px',
                  maxHeight: '200px',
                  overflow: 'auto',
                }}
              >
                {typeof request.body === 'string' ? request.body : JSON.stringify(request.body, null, 2)}
              </SyntaxHighlighter>
            </div>
          </div>
        )}

        {/* Explanation */}
        <div className="p-3 bg-blue-500/10 rounded border border-blue-500/20">
          <p className="text-sm text-blue-600 dark:text-blue-400">{explanation}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          onClick={onExecute}
          disabled={isGenerating || isExecuting}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
        >
          {isExecuting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mr-1.5"
              >
                <Loader2 className="w-4 h-4" />
              </motion.div>
              Executing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-1.5" />
              Run Request
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          disabled={isGenerating}
          className="hover:bg-blue-500/10"
        >
          <Edit className="w-4 h-4 mr-1.5" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onDiscard}
          disabled={isGenerating}
          className="hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          Discard
        </Button>
      </div>
    </motion.div>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex items-start gap-2 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-500' : 'bg-purple-500'
        } text-white flex-shrink-0 mt-1`}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
        <div className={`rounded-lg p-3 space-y-2 ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-card border border-border'
        }`}>
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          <div className={`text-xs opacity-70 ${isUser ? 'text-blue-100' : 'text-muted-foreground'}`}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ConversationPanel({
  session,
  onSessionUpdate,
  onRequestGenerated,
  onRequestExecuted,
  onClearSession,
  isLoading = false,
  baseUrl,
  apiSchema
}: ConversationPanelProps) {
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<{
    result: ConversationResult;
    messageId: string;
  } | null>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages, currentPreview]);

  const sendMessage = async () => {
    if (!message.trim() || isGenerating) return;

    const userMessage: ConversationMessage = {
      id: generateConversationId(),
      role: 'user',
      content: message.trim(),
      timestamp: Date.now(),
    };

    // Add user message to session
    const updatedSession = addMessageToSession(session, userMessage);
    onSessionUpdate(updatedSession);

    const currentMessage = message.trim();
    setMessage('');
    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/converse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          apiSchema,
          sessionContext: {
            previousRequests: session.context.previousRequests,
            variables: session.context.variables,
            baseUrl,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ConversationResult = await response.json();

      // Create assistant response message
      const assistantMessage: ConversationMessage = {
        id: generateConversationId(),
        role: 'assistant',
        content: result.explanation,
        timestamp: Date.now(),
        requestPreview: result.request,
      };

      const finalSession = addMessageToSession(updatedSession, assistantMessage);
      onSessionUpdate(finalSession);

      // Show request preview
      setCurrentPreview({
        result,
        messageId: assistantMessage.id,
      });

      if (result.clarificationNeeded) {
        toast.info('Clarification needed', {
          description: result.clarificationQuestion,
        });
      }

    } catch (error: any) {
      console.error('Conversation error:', error);
      
      const errorMessage: ConversationMessage = {
        id: generateConversationId(),
        role: 'assistant',
        content: `I'm having trouble processing your request right now. Error: ${error.message}. Please try again or rephrase your request.`,
        timestamp: Date.now(),
      };

      const errorSession = addMessageToSession(updatedSession, errorMessage);
      onSessionUpdate(errorSession);

      toast.error('Failed to generate request', {
        description: 'Please try again or check your connection',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const executeRequestDirectly = async () => {
    if (!currentPreview) return;

    setIsExecuting(true);
    setShowExecuteDialog(false);

    try {
      const request = currentPreview.result.request;
      
      const requestPayload = {
        method: request.method,
        url: request.url,
        headers: request.headers || {},
        body: request.body || null,
      };

      const response = await fetch('/api/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json();
      setExecutionResult(data);

      // Call the optional callback
      if (onRequestExecuted) {
        onRequestExecuted(request, data);
      }

      // Add execution result to conversation
      const resultMessage: ConversationMessage = {
        id: generateConversationId(),
        role: 'assistant',
        content: `✅ **Request executed successfully!**\n\n**Status:** ${data.status} ${data.statusText}\n**Response Time:** ${data.responseTime}ms\n**Size:** ${(data.size / 1024).toFixed(2)}KB\n\nThe response has been captured and you can view the full results in the Response panel.`,
        timestamp: Date.now(),
      };

      const updatedSession = addMessageToSession(session, resultMessage);
      onSessionUpdate(updatedSession);

      toast.success('Request executed!', {
        description: `${data.status} ${data.statusText} • ${data.responseTime}ms`
      });

      // Clear the preview after successful execution
      setCurrentPreview(null);

    } catch (error: any) {
      console.error('Request execution error:', error);
      
      const errorMessage: ConversationMessage = {
        id: generateConversationId(),
        role: 'assistant',
        content: `❌ **Request execution failed**\n\nError: ${error.message}\n\nPlease check the request details and try again.`,
        timestamp: Date.now(),
      };

      const errorSession = addMessageToSession(session, errorMessage);
      onSessionUpdate(errorSession);

      toast.error('Request failed', {
        description: error.message || 'Please try again'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const executeRequest = () => {
    if (currentPreview) {
      setShowExecuteDialog(true);
    }
  };

  const editRequest = () => {
    if (currentPreview) {
      onRequestGenerated(currentPreview.result.request, currentPreview.result.explanation);
      setCurrentPreview(null);
    }
  };

  const discardRequest = () => {
    setCurrentPreview(null);
  };

  const exportConversation = () => {
    const markdown = exportConversationAsMarkdown(session);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${session.id}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Conversation exported!', {
      description: 'Downloaded as Markdown file'
    });
  };

  const stats = getConversationStats(session);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            Conversation Mode
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {stats.requestsGenerated} requests
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={exportConversation}
            disabled={session.messages.length === 0}
            className="hover:bg-purple-500/10"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSession}
            disabled={session.messages.length === 0}
            className="hover:bg-red-500/10 hover:text-red-500"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <AnimatePresence>
          {session.messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center h-full text-center space-y-4 py-8"
            >
              <div>
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 2
                  }}
                  className="text-6xl mb-4"
                >
                  💬
                </motion.div>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Start a Conversation
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Describe what you want to do with the API in plain English. 
                  I'll generate the appropriate HTTP request for you.
                </p>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <p><strong>Examples:</strong></p>
                  <p>• "Get all users from /api/users"</p>
                  <p>• "Create a new post with title and content"</p>
                  <p>• "Update user 123 with new email"</p>
                </div>
              </div>
            </motion.div>
          ) : (
            session.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
        </AnimatePresence>

        {/* Current Preview */}
        {currentPreview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <RequestPreview
              request={currentPreview.result.request}
              explanation={currentPreview.result.explanation}
              confidence={currentPreview.result.confidence}
              onExecute={executeRequest}
              onEdit={editRequest}
              onDiscard={discardRequest}
              isGenerating={isGenerating}
              isExecuting={isExecuting}
            />
          </motion.div>
        )}

        {/* Loading indicator */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-4 text-muted-foreground"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-4 h-4" />
            </motion.div>
            <span className="text-sm">Thinking...</span>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-card/50 backdrop-blur-sm">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what you want to do with the API..."
            disabled={isGenerating || isLoading}
            className="flex-1 border-2 focus:border-purple-500 transition-colors"
          />
          <Button
            onClick={sendMessage}
            disabled={!message.trim() || isGenerating || isLoading}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            {isGenerating ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-4 h-4" />
              </motion.div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {baseUrl && (
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <Settings className="w-3 h-3" />
            Base URL: <code className="bg-muted px-1 rounded">{baseUrl}</code>
          </div>
        )}
      </div>

      {/* Execution Confirmation Dialog */}
      {showExecuteDialog && currentPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowExecuteDialog(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-lg border shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-semibold">Execute Request?</h3>
              </div>
              
              <p className="text-muted-foreground">
                This will execute the generated API request and show you the results. Do you want to proceed?
              </p>
              
              <div className="bg-muted/50 rounded p-3 text-sm font-mono">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-cyan-500 text-white text-xs">
                    {currentPreview.result.request.method}
                  </Badge>
                  <code className="break-all">{currentPreview.result.request.url}</code>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowExecuteDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={executeRequestDirectly}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  <Play className="w-4 h-4 mr-1.5" />
                  Execute
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
