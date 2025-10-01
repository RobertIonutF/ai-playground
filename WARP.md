# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**API Playground** is a fast, minimal web tool for testing and visualizing API requests. It's built as a lightweight alternative to Postman, focusing on simplicity and developer experience with zero setup required.

**Tech Stack:**
- Next.js 15 (App Router) with Turbopack
- TypeScript 5 (strict mode)
- React 19
- Tailwind CSS v4
- Shadcn UI components
- Framer Motion for animations
- localStorage for persistence

**Core Features:**
- HTTP request builder (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- Response visualization with pretty JSON, raw text, and headers
- **AI Response Interpreter**: AI-powered analysis of API responses with GPT-4o-mini
- Request history saved to localStorage (max 50 entries)
- Export/share via cURL commands
- CORS proxy through Next.js API routes
- Security: blocks localhost/private network requests

---

## Development Commands

### Running the Application
```bash
# Start development server with Turbopack
npm run dev

# Open http://localhost:3000
```

### Build and Production
```bash
# Create production build
npm run build

# Start production server
npm start
```

### Linting
```bash
# Run ESLint
npm run lint
```

### Testing Individual Components
There are no tests currently. When developing, test manually using:
- Public APIs from `EXAMPLES.md` (JSONPlaceholder, GitHub API, etc.)
- Keyboard shortcut: `Ctrl/Cmd + Enter` to send requests

---

## Architecture Overview

### Request Flow Architecture

The application uses a **client-side → proxy → external API** architecture:

1. **Client (Browser)**: User builds request in `RequestEditor.tsx`
2. **Next.js API Route** (`app/api/request/route.ts`): Acts as CORS proxy, applies security filters
3. **External API**: Target endpoint receives proxied request
4. **Response Flow**: Response flows back through proxy to `ResponseViewer.tsx`

**Why a proxy?** To bypass CORS restrictions that would block direct browser → API requests.

### Data Flow & State Management

State is managed with React hooks and persisted to localStorage:

- **Current Request State**: Managed in `app/page.tsx` via `useState<ApiRequest>`
- **Request History**: Persisted via `useLocalStorage` hook (max 50 entries)
- **Response State**: Ephemeral, stored in `useState<ApiResponse | null>`

### Component Structure

```
app/page.tsx (Main orchestrator)
├── RequestEditor.tsx (Left panel)
│   ├── Method selector + URL input
│   ├── Headers table (dynamic add/remove)
│   └── Body editor (JSON/raw)
├── ResponseViewer.tsx (Right panel)
│   ├── Status badge + metrics
│   ├── Pretty JSON view (JsonViewer.tsx)
│   ├── Raw text view
│   ├── Headers table
│   └── AI tab (AiExplanationView.tsx)
└── HistorySidebar.tsx (Collapsible sidebar)
    ├── Request list with badges
    └── Copy as cURL per request
```

### Key Type Definitions (`types/api.ts`)

```typescript
ApiRequest {
  id, name, method, url, headers[], body, bodyType, timestamp
}

ApiResponse {
  status, statusText, headers{}, data, responseTime, size
}

Header {
  id, key, value, enabled
}

// AI Interpreter Types
InterpreterInput {
  request: { method, url, headers, body },
  response: { status, durationMs, headers, body, sizeBytes },
  context: { apiLabel?, userLocale? }
}

InterpreterResult {
  summary: string,
  keyFacts: KeyFact[],
  errorInsight?: { probableCause, suggestedFix },
  suggestions: SuggestedCall[],
  confidence: 'low' | 'medium' | 'high'
}
```

### Security Implementation

Security checks in `app/api/request/route.ts`:
- Blocks requests to `localhost`, `127.0.0.1`, `0.0.0.0`, `::1`
- Blocks private networks: `10.*`, `172.16.*`, `192.168.*`, `169.254.*`
- 30-second request timeout (`maxDuration = 30`)
- No server-side storage of requests (all localStorage)

---

## File Organization & Conventions

### Path Aliases
- `@/*` maps to project root (configured in `tsconfig.json`)
- Example: `import { ApiRequest } from '@/types/api'`

### Component Patterns
- **Client components**: All UI components use `'use client'` directive
- **Server components**: Only `app/api/request/route.ts` is server-side
- **Hooks**: Custom hooks in `hooks/` (useLocalStorage, useMediaQuery)
- **Utilities**: Pure functions in `lib/` (api-utils.ts, utils.ts)

### Styling Approach
- Tailwind v4 with PostCSS
- Shadcn UI for base components (in `components/ui/`)
- Dark mode by default (configured in `app/layout.tsx`)
- Framer Motion for animations (AnimatePresence, motion.div)

### ID Generation
Use `generateId()` from `lib/api-utils.ts` for creating unique IDs:
```typescript
generateId() // Returns: `${Date.now()}-${randomString}`
```

---

## Working with Features

### Adding a New HTTP Method
1. Update `HttpMethod` type in `types/api.ts`
2. Add method to `HTTP_METHODS` array in `components/RequestEditor.tsx`
3. Add color mapping to `METHOD_COLORS` and `getMethodColor()` functions

### Adding New Request Metadata
1. Update `ApiRequest` interface in `types/api.ts`
2. Update default state in `app/page.tsx` (useState initialization)
3. Add UI controls in `RequestEditor.tsx`
4. Update `toCurl()` in `lib/api-utils.ts` if needed for export

### Modifying History Behavior
- Max history size: Change `MAX_HISTORY` constant in `app/page.tsx`
- Storage key: Change first param in `useLocalStorage('api-playground-history', [])`
- History is automatically saved after each request in `sendRequest()` function

### Adding Response Viewers
Add a new tab in `ResponseViewer.tsx`:
1. Add `<TabsTrigger>` to `<TabsList>`
2. Add `<TabsContent>` with your viewer component
3. Wrap in `motion.div` for consistent animations

---

## Code Style Guidelines

### TypeScript
- Strict mode enabled (no implicit any)
- Use interfaces for object shapes
- Type all function parameters and returns
- Use `Record<string, T>` for dynamic key objects

### React Patterns
- Prefer functional components with hooks
- Use `useState` for local state
- Use `useEffect` sparingly (mainly for localStorage sync)
- Extract reusable logic into custom hooks

### Animations
- Use Framer Motion's `motion.*` components
- Wrap lists with `<AnimatePresence>` for exit animations
- Standard timings: `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`

### Error Handling
- Try/catch in async functions
- Display errors in `ResponseViewer` with status 0
- Use `toast()` from Sonner for success/error notifications

---

## Important Implementation Details

### localStorage Synchronization
The `useLocalStorage` hook returns `[value, setValue, isLoaded]`:
- Always check `isLoaded` before rendering history-dependent UI
- Automatically syncs changes to localStorage on `setValue()`

### Request Proxying
All requests go through `/api/request`:
- Receives: `{ method, url, headers, body }`
- Returns: `{ status, statusText, headers, data, responseTime, size }`
- Automatically detects JSON vs text content-type

### cURL Export Format
Generated in `lib/api-utils.ts`:
```bash
curl -X METHOD 'url' \
  -H 'Header: Value' \
  -d 'body'
```
Single quotes are escaped, line continuations use `\\n`

### Response Time & Size Calculation
- **Time**: `Date.now()` delta before/after fetch
- **Size**: `new Blob([responseText]).size` in bytes
- Formatted with `formatResponseTime()` and `formatBytes()` utils

---

## Keyboard Shortcuts

**Implemented:**
- `Ctrl/Cmd + Enter` → Send request (in URL or body fields)
- `Esc` → Close sidebar on mobile (needs implementation check)

**To add new shortcuts:**
Add handler to `handleKeyPress` in `RequestEditor.tsx` or `app/page.tsx`

---

## Common Pitfalls

1. **CORS errors still occur?** 
   - Ensure all requests go through `/api/request`, not direct fetch
   - Check API doesn't have proxy-blocking policies

2. **History not persisting?**
   - Check browser localStorage isn't full
   - Verify `useLocalStorage` hook is properly awaiting `isLoaded`

3. **TypeScript errors on Shadcn components?**
   - Check `components.json` config matches installed Radix UI versions
   - Ensure `@/*` path alias is working in tsconfig

4. **Animations not working?**
   - Verify Framer Motion is imported from `framer-motion`
   - Check parent has `<AnimatePresence>` for exit animations

---

## Deployment

**Recommended:** Vercel (optimized for Next.js)

Build check before deployment:
```bash
npm run build
# Should complete without errors
# Check .next/ directory is created
```

Environment variables:
```bash
OPENAI_API_KEY=sk-your-key-here  # Required for AI features
```

Get your API key from: https://platform.openai.com/api-keys

---

## Future Development Notes

**Planned features** (from README.md roadmap):
- Collections (grouped requests)
- Environment variables (BASE_URL, API_KEY)
- Shareable links
- Authentication helpers (OAuth2, Bearer, Basic)
- Command palette (Ctrl + K)

**When implementing collections:**
- Add `CollectionId` to `ApiRequest` interface
- Create new `Collection` type with `id, name, requests[]`
- Update localStorage schema (consider migration strategy)
- Add new sidebar section or separate tab

**When adding environment variables:**
- Store in separate localStorage key
- Replace `{{VAR_NAME}}` in URL/headers/body before sending
- Add UI in settings or dedicated modal

---

## AI Response Interpreter

### Overview

The AI Response Interpreter uses OpenAI's GPT-4o-mini to automatically analyze API responses and provide:
- Natural language summaries
- Key facts extraction
- Error diagnosis (for 4xx/5xx responses)
- Suggested next API calls

### Architecture

**Flow:**
1. User clicks "Explain with AI" in Response Viewer's AI tab
2. `ResponseViewer.tsx` constructs `InterpreterInput` payload
3. Request sent to `/api/ai/explain`
4. API route sanitizes data (removes sensitive headers, truncates large bodies)
5. Sanitized payload sent to OpenAI with JSON schema enforcement
6. Structured response returned and cached
7. `AiExplanationView.tsx` renders the result

**Files:**
- `app/api/ai/explain/route.ts` - OpenAI API route with schema enforcement
- `components/AiExplanationView.tsx` - AI result display component
- `lib/ai-utils.ts` - Sanitization, caching, and utility functions
- `types/api.ts` - AI-related TypeScript interfaces

### Data Sanitization

Before sending to OpenAI, the system:
- **Redacts sensitive headers**: Authorization, API keys, tokens, cookies, sessions
- **Removes query params**: signature, sig, token, key, apikey
- **Truncates large bodies**: Max 64KB (prevents excessive token usage)
- **Handles binary data**: Replaces with `{type: 'binary', size: N}`

See `lib/ai-utils.ts` for implementation details.

### Caching Strategy

- **Hash-based**: Uses SHA-256 of sanitized payload as cache key
- **In-memory**: Simple Map with LRU eviction (max 100 entries)
- **TTL**: 1 hour (3600000ms)
- **Location**: `aiResponseCache` in `lib/ai-utils.ts`

**For production**: Consider replacing with Redis or similar distributed cache.

### Schema Enforcement

OpenAI is called with `response_format: { type: 'json_schema' }` to guarantee consistent structure:

```typescript
{
  summary: string (≤ 900 chars),
  keyFacts: Array<{label, value}> (≤ 6 items),
  errorInsight?: {probableCause, suggestedFix},
  suggestions: Array<{method, path, description}> (≤ 4 items),
  confidence: 'low' | 'medium' | 'high'
}
```

If OpenAI fails or returns invalid JSON, system falls back to basic summary.

### Suggested Next Calls

When AI suggests next endpoints:
1. User clicks suggestion in `AiExplanationView`
2. `onLoadSuggestion` callback fires
3. Main page updates `currentRequest` with new method/URL
4. User can modify and send immediately

**URL construction:**
- Absolute URLs (`http://...`) used as-is
- Relative paths (`/users/42`) prepended with base URL from current request

### Error Handling

**Fallback behavior:**
- API timeout → basic summary with low confidence
- Schema validation failure → retry once, then fallback
- OpenAI API error → fallback summary
- Missing API key → error message in UI

**All failures return 200 status** so UI can display fallback gracefully.

### Cost Optimization

- **Model**: Using `gpt-4o-mini` for cost efficiency
- **Token limit**: Max 1500 tokens per request
- **Body truncation**: 64KB limit reduces input tokens
- **Caching**: Identical requests served from cache
- **Temperature**: 0.3 for consistent, focused responses

### Testing AI Features

1. **Set up API key:**
   ```bash
   # Edit .env.local
   OPENAI_API_KEY=sk-your-actual-key
   ```

2. **Test scenarios:**
   - Success response (200): Should extract key fields, suggest related endpoints
   - Error response (404): Should identify probable cause, suggest fix
   - Large response: Should truncate and still analyze
   - Cached response: Second identical request should return instantly

3. **Example test request:**
   ```
   GET https://api.github.com/users/github
   ```
   Expected AI output:
   - Summary of user profile
   - Key facts: login, id, name, public_repos
   - Suggestions: GET /users/github/repos, GET /users/github/followers

### Modifying AI Behavior

**Change model:**
```typescript
// In app/api/ai/explain/route.ts
model: 'gpt-4o-mini' // Change to 'gpt-4o' or 'gpt-4-turbo'
```

**Adjust temperature:**
```typescript
temperature: 0.3 // 0.0 = deterministic, 1.0 = creative
```

**Modify system prompt:**
```typescript
// In app/api/ai/explain/route.ts
const SYSTEM_PROMPT = `Your instructions here...`
```

**Change cache settings:**
```typescript
// In lib/ai-utils.ts
export const aiResponseCache = new ResponseCache(
  3600000, // TTL in ms (1 hour)
  100      // Max entries
);
```

### Limitations

- **No streaming**: Results appear all at once (could add streaming in future)
- **Rate limiting**: No per-user rate limiting yet (planned: 30 calls/hour)
- **Cost tracking**: No built-in cost monitoring
- **Multi-language**: Currently English-only
- **Context length**: Very large responses (>64KB) are truncated

### Security Notes

- Sensitive data NEVER sent to OpenAI (sanitized first)
- API key stored server-side only (never exposed to client)
- Cache is in-memory (cleared on server restart)
- No request/response data logged to OpenAI servers beyond API call

