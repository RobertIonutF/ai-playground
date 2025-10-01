import { useEffect, useState } from 'react';
import { ApiContext } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllContexts, getActiveContext, setActiveContext, deleteContext } from '@/lib/context-store';
import { Trash2, RefreshCcw, CheckCircle2 } from 'lucide-react';

interface ApiContextSelectorProps {
  onChange?: (context: ApiContext | null) => void;
}

export function ApiContextSelector({ onChange }: ApiContextSelectorProps) {
  const [contexts, setContexts] = useState<ApiContext[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = () => {
    const all = getAllContexts();
    setContexts(all);
    setActiveId(getActiveContext()?.id || null);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSelect = (id: string) => {
    try {
      setActiveContext(id);
      setActiveId(id);
      const ctx = getActiveContext();
      onChange?.(ctx);
    } catch (e) {
      onChange?.(null);
    }
  };

  const handleClear = () => {
    setActiveContext(null);
    setActiveId(null);
    onChange?.(null);
  };

  const handleDelete = (id: string) => {
    deleteContext(id);
    load();
    if (activeId === id) {
      onChange?.(getActiveContext());
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={activeId || ''} onValueChange={handleSelect}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select API Context" />
        </SelectTrigger>
        <SelectContent>
          {contexts.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No contexts available</div>
          ) : (
            contexts.map(ctx => (
              <div key={ctx.id} className="flex items-center justify-between px-2">
                <SelectItem value={ctx.id}>
                  <div className="flex items-center gap-2">
                    {activeId === ctx.id && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    <span className="text-sm">{ctx.name}</span>
                  </div>
                </SelectItem>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(ctx.id)} className="text-rose-500">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </SelectContent>
      </Select>

      <Button variant="outline" size="icon" onClick={load}>
        <RefreshCcw className="w-4 h-4" />
      </Button>

      <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground">
        Clear
      </Button>
    </div>
  );
}

