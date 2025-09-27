# Verge Frontend

A modern React-based chat interface for the Verge news chatbot, built with cutting-edge web technologies for optimal user experience.

## Technology Stack

### Core Framework
- **React 19.1.1** - Latest React with concurrent features
- **TypeScript 5.8.3** - Type-safe development
- **Vite 7.1.7** - Lightning-fast build tool and dev server

### UI & Styling
- **Tailwind CSS 4.1.13** - Utility-first CSS framework with latest features
- **Radix UI** - Accessible, unstyled UI primitives
  - `@radix-ui/react-dialog` - Modal and dialog components
  - `@radix-ui/react-tooltip` - Accessible tooltips
- **Lucide React** - Beautiful, customizable icons
- **Framer Motion 12.23.21** - Smooth animations and transitions
- **Sonner** - Toast notifications

### State Management & Data
- **Axios 1.12.2** - HTTP client for API communication
- **Local Storage API** - Client-side session persistence
- **Custom React Hooks** - Reusable state logic

### Development Tools
- **ESLint 9.36.0** - Code linting with latest rules
- **TypeScript ESLint** - TypeScript-specific linting
- **Vite Plugin React** - Hot module replacement
- **npm** - Fast, disk space efficient package manager

## Architecture

### Component Structure
```
src/
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── ai-prompt-box.tsx  # Custom chat input with rich features
│   │   └── sonner.tsx         # Toast notification wrapper
│   ├── ThinkingIndicator.tsx  # AI typing animation
│   └── ServerWarmingScreen.tsx # Server connection status
├── hooks/
│   └── useServerStatus.ts     # Server health monitoring
├── utils/
│   ├── localStorage.ts        # Session management utilities
│   └── markdown.tsx           # Markdown rendering
├── lib/
│   └── utils.ts              # Shared utility functions
└── App.tsx                   # Main application component
```

### Key Features

#### Advanced Chat Interface
- **Custom Prompt Input**: Built with Radix UI primitives
- **Auto-resizing Textarea**: Dynamically adjusts to content
- **Rich Interactions**: Tooltips, keyboard shortcuts (Enter to send)
- **Loading States**: Visual feedback during AI responses
- **Markdown Support**: Renders formatted AI responses

#### Session Management
- **Persistent Sessions**: Automatic session restoration
- **Session History**: Browse and resume previous conversations
- **Local Storage**: Client-side session caching
- **Session Cleanup**: Automatic cleanup of old sessions (7-day retention)

#### Real-time Features
- **Server Status Monitoring**: Connection health checks
- **Typing Indicators**: Shows when AI is thinking
- **Progressive Loading**: Smooth message streaming
- **Error Handling**: Graceful degradation on connection issues

#### Responsive Design
- **Mobile-First**: Optimized for all screen sizes
- **Dark Theme**: Modern dark UI with careful color choices
- **Smooth Animations**: Framer Motion powered transitions
- **Accessibility**: ARIA compliant with keyboard navigation

## Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api

# Optional: Development settings
VITE_NODE_ENV=development
```

### Build Configuration

The project uses Vite with optimized settings:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

## Development

### Prerequisites
- Node.js 18.0.0 or higher
- npm (recommended) or npm

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm dev

# Build for production
npm build

# Preview production build
npm preview
```

### Development Server
The development server runs on `http://localhost:5173` with:
- Hot Module Replacement (HMR)
- TypeScript checking
- ESLint integration
- Automatic browser refresh

### Code Quality
```bash
# Run ESLint
npm lint

# Type checking
npm type-check
```

## Component Architecture

### AI Prompt Box
A sophisticated chat input component with:
- **Auto-sizing**: Grows with content up to max height
- **Rich Interactions**: Tooltips, keyboard shortcuts
- **Loading States**: Visual feedback during processing
- **Accessibility**: Full keyboard navigation support

### Session Management
Client-side session handling with:
- **Automatic Persistence**: Sessions saved to localStorage
- **Smart Caching**: Efficient memory usage
- **Cleanup Logic**: Removes old sessions automatically
- **Error Recovery**: Graceful handling of corrupted data

### Server Status Hook
Real-time server monitoring:
- **Health Checks**: Periodic API health verification
- **Connection States**: Checking, warming, ready, error
- **Retry Logic**: Automatic reconnection attempts
- **User Feedback**: Clear status indicators

## Performance Optimizations

### Bundle Optimization
- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Removes unused code
- **Asset Optimization**: Compressed images and fonts
- **Modern Builds**: ES2020+ for modern browsers

### Runtime Performance
- **React 19 Features**: Concurrent rendering and transitions
- **Memoization**: Prevents unnecessary re-renders
- **Lazy Loading**: Components loaded on demand
- **Efficient Updates**: Minimal DOM manipulation

### Caching Strategy
- **Session Data**: Persistent localStorage caching
- **API Responses**: Smart caching with TTL
- **Static Assets**: Browser caching headers
- **Service Worker**: (Future enhancement)

## Styling Approach

### Tailwind CSS 4.x
- **Utility-First**: Rapid development with utility classes
- **Custom Design System**: Consistent spacing, colors, typography
- **Responsive Design**: Mobile-first breakpoints
- **Dark Theme**: Carefully crafted dark color palette

### Component Styling
- **CSS-in-JS**: Styled with Tailwind utilities
- **Variant System**: Consistent component variations
- **Animation Classes**: Smooth micro-interactions
- **Accessibility**: Focus states and screen reader support

## API Integration

### HTTP Client Configuration
```typescript
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Axios instance with interceptors
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### Error Handling
- **Network Errors**: Automatic retry with exponential backoff
- **API Errors**: User-friendly error messages
- **Timeout Handling**: Graceful timeout management
- **Offline Support**: Basic offline detection

## Testing Strategy

### Unit Testing (Future)
- **React Testing Library**: Component testing
- **Jest**: Test runner and assertions
- **MSW**: API mocking for tests
- **Coverage Reports**: Code coverage tracking

### E2E Testing (Future)
- **Playwright**: End-to-end testing
- **Visual Regression**: Screenshot comparisons
- **Performance Testing**: Core Web Vitals monitoring

## Deployment

### Production Build
```bash
# Create optimized build
npm build

# Serve locally for testing
npm preview
```

### Build Output
- **Static Files**: Optimized HTML, CSS, JS
- **Asset Hashing**: Cache-busting filenames
- **Source Maps**: Debugging support
- **Compression**: Gzip/Brotli ready

### Hosting Options
- **Vercel**: Zero-config deployment
- **Netlify**: JAMstack hosting
- **AWS S3 + CloudFront**: Scalable CDN
- **Docker**: Containerized deployment

## Browser Support

### Modern Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Features Used
- ES2020+ syntax
- CSS Grid and Flexbox
- Web APIs: localStorage, fetch
- Modern JavaScript features

## Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes with proper TypeScript types
4. Test thoroughly in development
5. Run linting: `npm lint`
6. Submit pull request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Enforced code style
- **Prettier**: Consistent formatting
- **Conventional Commits**: Structured commit messages

## Troubleshooting

### Common Issues

**Development server won't start**
- Check Node.js version (18.0.0+)
- Clear node_modules: `rm -rf node_modules && npm install`
- Check port availability (5173)

**API connection failed**
- Verify backend is running on port 3000
- Check VITE_API_BASE_URL in .env
- Ensure CORS is configured in backend

**Build failures**
- Run type checking: `npm type-check`
- Check for ESLint errors: `npm lint`
- Clear Vite cache: `rm -rf node_modules/.vite`

### Performance Issues
- Check React DevTools for unnecessary renders
- Monitor bundle size with `npm build --analyze`
- Profile with browser DevTools

## Future Enhancements

### Planned Features
- **PWA Support**: Service worker and offline functionality
- **Real-time Updates**: WebSocket integration
- **Voice Input**: Speech-to-text capability
- **File Uploads**: Document and image support
- **Themes**: Multiple color schemes
- **Internationalization**: Multi-language support

### Technical Improvements
- **Testing Suite**: Comprehensive test coverage
- **Performance Monitoring**: Real user metrics
- **Error Tracking**: Sentry integration
- **Analytics**: User behavior insights
