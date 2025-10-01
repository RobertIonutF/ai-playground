# 🚀 API Playground

**Play with APIs, not with complexity.**

A fast, minimal, and visually clear web tool that lets developers test, visualize, and share API requests in seconds — without the complexity of Postman.

![Version](https://img.shields.io/badge/version-1.0.0_MVP-cyan)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### MVP Features (v1.0)

✅ **Simple Request Builder**
- Method selector (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- URL input with validation
- Custom headers with enable/disable toggle
- JSON and raw body support

✅ **Beautiful Response Viewer**
- Pretty JSON formatting with syntax highlighting
- Raw text view
- Response headers inspection
- Status code indicators with color coding
- Response time and size metrics

✅ **🧩 AI Auto Type Generator (NEW!)**
- Generate TypeScript interfaces from API responses
- Create Zod validation schemas automatically
- Generate Python dataclasses
- AI-powered type inference with GPT-4
- Copy to clipboard or download as files
- Intelligent caching and validation

✅ **Request History**
- Automatic saving of all requests to localStorage
- Quick load from history
- Copy as cURL command
- Clear history option

✅ **Export & Share**
- Copy response to clipboard
- Export response as JSON file
- Copy request as cURL command
- Save requests for later use

✅ **Developer Experience**
- Keyboard shortcuts (Ctrl/Cmd + Enter to send)
- Dark mode by default
- Responsive layout
- Split-screen design
- Console-like aesthetic

## 🎯 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/api-playground.git

# Navigate to project directory
cd api-playground

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

For AI features to work, you'll need to set up your OpenAI API key:

```bash
# Create .env.local file
cp .env.example .env.local

# Add your OpenAI API key
OPENAI_API_KEY=your_openai_api_key_here
```

### Build for Production

```bash
npm run build
npm start
```

## 🎮 Usage

### Making Your First Request

1. **Enter a URL**: Type or paste an API endpoint in the URL field
2. **Select Method**: Choose HTTP method from the dropdown (default: GET)
3. **Add Headers** (optional): Click "Add Header" to include custom headers
4. **Add Body** (optional): Switch to "Body" tab for POST/PUT requests
5. **Send**: Click the "Send" button or press Ctrl/Cmd + Enter
6. **View Response**: See the formatted response on the right panel
7. **Generate Types** (optional): Click the "Types" tab and use AI to generate type definitions

### Example Requests

#### GET Request
```
URL: https://api.github.com/users/github
Method: GET
```

#### POST Request with JSON
```
URL: https://jsonplaceholder.typicode.com/posts
Method: POST
Headers:
  Content-Type: application/json
Body:
{
  "title": "foo",
  "body": "bar",
  "userId": 1
}
```

### Keyboard Shortcuts

- `Ctrl/Cmd + Enter` - Send request
- `Esc` - Close sidebar (mobile)

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn UI
- **Icons**: Lucide React
- **State Management**: React Hooks + localStorage

### Project Structure

```
api-playground/
├── app/
│   ├── api/
│   │   ├── request/
│   │   │   └── route.ts          # API proxy handler
│   │   └── ai/
│   │       ├── explain/
│   │       │   └── route.ts      # AI explanation endpoint
│   │       └── generate-types/
│   │           └── route.ts      # AI type generation endpoint
│   ├── layout.tsx                 # Root layout with dark mode
│   ├── page.tsx                   # Main application page
│   └── globals.css                # Global styles
├── components/
│   ├── RequestEditor.tsx          # Left panel - request builder
│   ├── ResponseViewer.tsx         # Right panel - response display
│   ├── TypeGeneratorView.tsx      # AI type generator component
│   ├── AiExplanationView.tsx      # AI explanation component
│   ├── HistorySidebar.tsx         # History sidebar
│   └── ui/                        # Shadcn UI components
├── hooks/
│   └── useLocalStorage.ts         # localStorage hook
├── lib/
│   ├── api-utils.ts               # Utility functions
│   ├── ai-utils.ts                # AI-specific utilities
│   └── utils.ts                   # Shadcn utils
├── types/
│   └── api.ts                     # TypeScript interfaces
└── AI_TYPE_GENERATOR.md           # Feature documentation
```

## 🔒 Security Features

- **CORS Proxy**: All requests go through Next.js API route to handle CORS
- **Network Security**: Blocks requests to localhost and private networks
- **Request Timeout**: 30-second maximum duration
- **No Server Storage**: All data stored locally in browser

## 🎨 Design Philosophy

API Playground follows these principles:

1. **Minimal Interface** - No clutter, just what you need
2. **Fast Feedback** - Instant response visualization
3. **Developer First** - Keyboard shortcuts, dark mode, console aesthetic
4. **Zero Friction** - No sign-up, no installation, works immediately

## 🗺️ Roadmap

### Beta (v1.1) - Coming Soon
- [ ] Collections (grouped requests)
- [ ] Environment variables (BASE_URL, API_KEY)
- [ ] Shareable links for requests
- [ ] Visual endpoint graph

### v2.0
- [ ] Authentication helpers (OAuth2, Bearer, Basic)
- [ ] Auto-generate documentation from collections
- [ ] Team collaboration features
- [ ] AI assistant for request generation

### v3.0
- [ ] Command palette (Ctrl + K)
- [ ] GitHub integration
- [ ] Public API gallery
- [ ] Request mocking

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Fundulea Robert Ionuț**

- GitHub: [@robertfundulea](https://github.com/robertfundulea)

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Shadcn UI](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- Inspired by Postman, Insomnia, and developer frustration with bloated tools

---

**Made with ❤️ for developers who want to move fast**

*"Play with APIs, not with complexity"*

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
