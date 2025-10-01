'use client';

import { AutoTypeResult, TypeLanguage, TypeStyle } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Code2, 
  Copy, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  FileCode,
  Zap
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface TypeGeneratorViewProps {
  responseData: any;
  onGenerateTypes?: (language: TypeLanguage, style: TypeStyle) => void;
  isGenerating?: boolean;
  generatedTypes?: AutoTypeResult | null;
  error?: string | null;
}

const LANGUAGE_OPTIONS = [
  { value: 'typescript', label: 'TypeScript', icon: '🔷' },
  { value: 'python', label: 'Python', icon: '🐍' },
];

const STYLE_OPTIONS = {
  typescript: [
    { value: 'interface', label: 'Interface', description: 'TypeScript interface definitions' },
    { value: 'zod', label: 'Zod Schema', description: 'Zod validation schemas' },
  ],
  python: [
    { value: 'dataclass', label: 'Dataclass', description: 'Python dataclass definitions' },
  ],
};

export function TypeGeneratorView({ 
  responseData, 
  onGenerateTypes, 
  isGenerating = false,
  generatedTypes,
  error
}: TypeGeneratorViewProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<TypeLanguage>('typescript');
  const [selectedStyle, setSelectedStyle] = useState<TypeStyle>('interface');
  const [copied, setCopied] = useState<string | null>(null);

  // Update style when language changes
  const handleLanguageChange = (language: TypeLanguage) => {
    setSelectedLanguage(language);
    const availableStyles = STYLE_OPTIONS[language];
    if (availableStyles && !availableStyles.some(s => s.value === selectedStyle)) {
      setSelectedStyle(availableStyles[0].value as TypeStyle);
    }
  };

  const handleGenerate = () => {
    onGenerateTypes?.(selectedLanguage, selectedStyle);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied to clipboard!', {
      description: 'Type definitions copied successfully'
    });
  };

  const downloadCode = () => {
    if (!generatedTypes) return;
    
    const extension = generatedTypes.language === 'typescript' ? '.ts' : '.py';
    const filename = `api-types-${Date.now()}${extension}`;
    
    const blob = new Blob([generatedTypes.code], { 
      type: generatedTypes.language === 'typescript' ? 'text/typescript' : 'text/python' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Downloaded!', {
      description: `Types saved as ${filename}`
    });
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: 'bg-emerald-500 hover:bg-emerald-600',
      medium: 'bg-amber-500 hover:bg-amber-600',
      low: 'bg-gray-500 hover:bg-gray-600',
    };

    return (
      <Badge className={`${colors[confidence as keyof typeof colors]} text-white text-xs font-semibold`}>
        {confidence.toUpperCase()} CONFIDENCE
      </Badge>
    );
  };

  const getLanguageForHighlighter = (language: TypeLanguage) => {
    return language === 'typescript' ? 'typescript' : 'python';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 py-2 pb-6"
    >
      {/* Generator Controls */}
      <Card className="border-purple-500/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Code2 className="w-5 h-5 text-purple-500" />
            </motion.div>
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              AI Type Generator
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Language</label>
              <Select
                value={selectedLanguage}
                onValueChange={handleLanguageChange}
              >
                <SelectTrigger className="border-2 hover:border-purple-500/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span>{option.icon}</span>
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Style Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Style</label>
              <Select
                value={selectedStyle}
                onValueChange={(value) => setSelectedStyle(value as TypeStyle)}
              >
                <SelectTrigger className="border-2 hover:border-pink-500/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_OPTIONS[selectedLanguage]?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="space-y-1">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center pt-2">
            <Button
              onClick={handleGenerate}
              disabled={!responseData || isGenerating}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 min-w-40"
            >
              {isGenerating ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2"
                >
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-4 h-4" />
                  </motion.span>
                  Generating...
                </motion.span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate Types
                </span>
              )}
            </Button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Generated Code */}
      <AnimatePresence>
        {generatedTypes && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-cyan-500/20 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-cyan-500" />
                    Generated Types
                    <Badge variant="outline" className="ml-2">
                      {generatedTypes.language} • {generatedTypes.style}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getConfidenceBadge(generatedTypes.confidence)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Notes */}
                {generatedTypes.notes && generatedTypes.notes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Notes
                    </h4>
                    <div className="space-y-1">
                      {generatedTypes.notes.map((note, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <div className="w-1 h-1 rounded-full bg-cyan-500 mt-2 flex-shrink-0" />
                          {note}
                        </motion.div>
                      ))}
                    </div>
                    <Separator />
                  </div>
                )}

                {/* Code Display */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Generated Code
                    </h4>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generatedTypes.code, 'code')}
                        className="hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all"
                      >
                        {copied === 'code' ? (
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
                        onClick={downloadCode}
                        className="hover:bg-blue-500/10 hover:border-blue-500/50 transition-all"
                      >
                        <Download className="w-4 h-4 mr-1.5" />
                        Download
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <ScrollArea className="h-96 w-full rounded-lg border border-border/50">
                      <SyntaxHighlighter
                        language={getLanguageForHighlighter(generatedTypes.language)}
                        style={oneDark}
                        customStyle={{
                          margin: 0,
                          padding: '16px',
                          background: 'transparent',
                          fontSize: '14px',
                          lineHeight: '1.5',
                        }}
                        showLineNumbers={true}
                        wrapLines={true}
                        wrapLongLines={true}
                      >
                        {generatedTypes.code}
                      </SyntaxHighlighter>
                    </ScrollArea>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!generatedTypes && !isGenerating && !error && (
        <div className="flex items-center justify-center h-64">
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
              className="text-6xl mb-4"
            >
              🧩
            </motion.div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Ready to Generate Types
            </h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Select your preferred language and style, then click Generate to create type-safe definitions from the API response.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
              <Zap className="w-4 h-4 text-purple-500" />
              <span>AI-powered • Type-safe • Export ready</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
        <Sparkles className="w-3 h-3 text-purple-500" />
        <span>Powered by AI • Generated code may need review</span>
      </div>
    </motion.div>
  );
}
