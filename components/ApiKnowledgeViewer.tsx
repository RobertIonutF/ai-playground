'use client';

import { useState, useMemo } from 'react';
import { ApiContext, ApiEndpoint, HttpMethod } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ChevronDown, ChevronRight, ArrowRight, Lock, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ApiKnowledgeViewerProps {
  context: ApiContext;
  onSelectEndpoint: (endpoint: ApiEndpoint) => void;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-emerald-500 text-white',
  POST: 'bg-cyan-500 text-white',
  PUT: 'bg-amber-500 text-white',
  DELETE: 'bg-rose-500 text-white',
  PATCH: 'bg-purple-500 text-white',
  HEAD: 'bg-gray-500 text-white',
  OPTIONS: 'bg-blue-500 text-white',
};

export function ApiKnowledgeViewer({ context, onSelectEndpoint }: ApiKnowledgeViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));

  // Group endpoints by tags or by method if no tags
  const groupedEndpoints = useMemo(() => {
    const groups: Record<string, ApiEndpoint[]> = {};

    context.endpoints.forEach(endpoint => {
      if (endpoint.tags && endpoint.tags.length > 0) {
        endpoint.tags.forEach(tag => {
          if (!groups[tag]) {
            groups[tag] = [];
          }
          groups[tag].push(endpoint);
        });
      } else {
        // Untagged endpoints go to "Other" group
        if (!groups['Other']) {
          groups['Other'] = [];
        }
        groups['Other'].push(endpoint);
      }
    });

    return groups;
  }, [context.endpoints]);

  // Filter endpoints based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groupedEndpoints;
    }

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, ApiEndpoint[]> = {};

    Object.entries(groupedEndpoints).forEach(([tag, endpoints]) => {
      const matchingEndpoints = endpoints.filter(endpoint => 
        endpoint.path.toLowerCase().includes(query) ||
        endpoint.method.toLowerCase().includes(query) ||
        endpoint.summary?.toLowerCase().includes(query) ||
        endpoint.description?.toLowerCase().includes(query)
      );

      if (matchingEndpoints.length > 0) {
        filtered[tag] = matchingEndpoints;
      }
    });

    return filtered;
  }, [groupedEndpoints, searchQuery]);

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const handleSelectEndpoint = (endpoint: ApiEndpoint) => {
    onSelectEndpoint(endpoint);
  };

  const totalEndpoints = Object.values(filteredGroups).reduce((sum, endpoints) => sum + endpoints.length, 0);

  return (
    <Card className="h-full border-2 border-primary/20 bg-card/95 backdrop-blur-sm flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-2xl">📚</span>
              {context.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {totalEndpoints} endpoint{totalEndpoints !== 1 ? 's' : ''} • {context.baseUrl}
            </CardDescription>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search endpoints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 border-2"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="px-6 pb-6 space-y-2">
            {Object.keys(filteredGroups).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No endpoints found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              Object.entries(filteredGroups).map(([tag, endpoints]) => (
                <div key={tag} className="border border-border/50 rounded-lg overflow-hidden">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(tag)}
                    className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedGroups.has(tag) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span className="font-semibold text-sm">{tag}</span>
                      <span className="text-xs text-muted-foreground">
                        ({endpoints.length})
                      </span>
                    </div>
                  </button>

                  {/* Endpoints List */}
                  <AnimatePresence>
                    {expandedGroups.has(tag) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="divide-y divide-border/50">
                          {endpoints.map((endpoint, index) => (
                            <motion.div
                              key={`${endpoint.method}-${endpoint.path}-${index}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.02 }}
                              className="p-3 hover:bg-muted/20 transition-colors group"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  {/* Method and Path */}
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${METHOD_COLORS[endpoint.method]}`}>
                                      {endpoint.method}
                                    </span>
                                    <code className="text-sm font-mono text-foreground truncate flex-1">
                                      {endpoint.path}
                                    </code>
                                    {endpoint.requiresAuth && (
                                      <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" title="Requires authentication" />
                                    )}
                                  </div>

                                  {/* Summary */}
                                  {endpoint.summary && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                                      {endpoint.summary}
                                    </p>
                                  )}

                                  {/* Parameters */}
                                  {endpoint.parameters && endpoint.parameters.length > 0 && (
                                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                                      <Info className="w-3 h-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">
                                        {endpoint.parameters.length} parameter{endpoint.parameters.length !== 1 ? 's' : ''}
                                        {endpoint.parameters.some(p => p.required) && (
                                          <span className="text-amber-500 ml-1">
                                            ({endpoint.parameters.filter(p => p.required).length} required)
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Insert Button */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSelectEndpoint(endpoint)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                >
                                  <ArrowRight className="w-4 h-4 mr-1" />
                                  Use
                                </Button>
                              </div>

                              {/* Expanded Details (on hover or click) */}
                              {endpoint.description && (
                                <div className="mt-2 pt-2 border-t border-border/30">
                                  <p className="text-xs text-muted-foreground">
                                    {endpoint.description}
                                  </p>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

