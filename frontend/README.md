# Verge Frontend

A modern React chat interface for the Verge news chatbot.

## Tech Stack

- **React 19** + **TypeScript** - Modern React with type safety
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Axios** - API communication
- **Sonner** - Toast notifications

## Features

- 🤖 **AI Chat Interface** - Clean, responsive chat UI
- 💾 **Session Management** - Persistent chat history
- 🔄 **Server Status** - Cold start detection and warming screen
- 📱 **Mobile Optimized** - Works great on all devices
- 🎨 **Dark Theme** - Modern, easy-on-the-eyes design
- ✨ **Smooth Animations** - Engaging user interactions

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Setup
Create a `.env` file:
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Project Structure
```
src/
├── components/          # UI components
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── App.tsx            # Main app component
```

## Development

The dev server runs on `http://localhost:5173` with hot reloading.

```bash
# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

## Key Components

- **Chat Interface** - Main chat window with message history
- **Server Warming** - Handles cold start with progress indicator
- **Session Management** - Automatic session persistence and restoration
- **Thinking Animation** - Dynamic AI response indicators

---

Made with ❤️ by [basith](https://www.basith.me/)
