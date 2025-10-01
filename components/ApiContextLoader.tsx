'use client';

import { useState } from 'react';
import { ApiContext } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, Link as LinkIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ApiContextLoaderProps {
  onContextLoaded: (context: ApiContext) => void;
  onClose?: () => void;
}

export function ApiContextLoader({ onContextLoaded, onClose }: ApiContextLoaderProps) {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFetchFromUrl = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/context/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch documentation');
      }

      if (!data.success || !data.context) {
        throw new Error('Invalid response from server');
      }

      setSuccess(true);
      
      // Save context to store
      await fetch('/api/context/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: data.context }),
      });

      toast.success('API Context Loaded!', {
        description: `Detected ${data.stats.endpointCount} endpoints from ${data.stats.sourceType}`,
      });

      onContextLoaded(data.context);

      // Clear form after delay
      setTimeout(() => {
        setUrl('');
        setSuccess(false);
        onClose?.();
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to load API documentation');
      toast.error('Failed to load documentation', {
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = ['application/json', 'text/plain'];
    const validExtensions = ['.json', '.yaml', '.yml'];
    const isValidType = validTypes.includes(file.type) || 
      validExtensions.some(ext => file.name.endsWith(ext));

    if (!isValidType) {
      setError('Please upload a JSON or YAML file');
      return;
    }

    // Check file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const text = await file.text();
      let content;

      try {
        content = JSON.parse(text);
      } catch {
        // If JSON parsing fails, send as string
        content = text;
      }

      const response = await fetch('/api/context/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filename: file.name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse file');
      }

      if (!data.success || !data.context) {
        throw new Error('Invalid response from server');
      }

      setSuccess(true);

      // Save context to store
      await fetch('/api/context/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: data.context }),
      });

      toast.success('API Context Loaded!', {
        description: `Parsed ${data.stats.endpointCount} endpoints from ${file.name}`,
      });

      onContextLoaded(data.context);

      // Clear form after delay
      setTimeout(() => {
        setSuccess(false);
        onClose?.();
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to process file');
      toast.error('Failed to process file', {
        description: err.message,
      });
    } finally {
      setIsLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <Card className="w-full max-w-2xl border-2 border-primary/20 bg-card/95 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">📚</span>
          Load API Documentation
        </CardTitle>
        <CardDescription>
          Import OpenAPI, Swagger, or Postman documentation to auto-populate endpoints
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mode Selection */}
        <div className="flex gap-2">
          <Button
            variant={mode === 'url' ? 'default' : 'outline'}
            onClick={() => setMode('url')}
            className="flex-1"
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            From URL
          </Button>
          <Button
            variant={mode === 'upload' ? 'default' : 'outline'}
            onClick={() => setMode('upload')}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'url' ? (
            <motion.div
              key="url-mode"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Documentation URL</label>
                <Input
                  placeholder="https://petstore.swagger.io/v2/swagger.json"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleFetchFromUrl();
                    }
                  }}
                  disabled={isLoading}
                  className="border-2"
                />
                <p className="text-xs text-muted-foreground">
                  Supports OpenAPI/Swagger JSON, Postman collections, or API documentation pages
                </p>
              </div>

              <Button
                onClick={handleFetchFromUrl}
                disabled={isLoading || !url.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Fetching & Parsing...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Loaded Successfully!
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Fetch Documentation
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="upload-mode"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Select File</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".json,.yaml,.yml,application/json,text/yaml"
                    onChange={handleFileUpload}
                    disabled={isLoading}
                    className="block w-full text-sm text-muted-foreground
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary file:text-primary-foreground
                      hover:file:bg-primary/90
                      file:cursor-pointer cursor-pointer
                      border-2 border-dashed border-border rounded-md p-4
                      hover:border-primary/50 transition-colors"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Accepts JSON or YAML files up to 2MB (OpenAPI, Swagger, Postman)
                </p>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing file...
                </div>
              )}

              {success && (
                <div className="flex items-center justify-center p-4 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  File processed successfully!
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md"
          >
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Error</p>
              <p className="text-destructive/90">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Example URLs */}
        <div className="pt-2 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => {
                setUrl('https://petstore.swagger.io/v2/swagger.json');
                setMode('url');
              }}
            >
              Petstore API
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => {
                setUrl('https://api.github.com/');
                setMode('url');
              }}
            >
              GitHub API
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

