# OP SkillSim

VR Training Simulation Platform for plumbing skills training with real-time 3D streaming.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: 19.2.0
- **TypeScript**: 5.x
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS 4
- **Streaming**: PureWeb Platform SDK
- **Testing**: Vitest + React Testing Library

## Project Structure

```
app/
├── api/                    # Next.js API routes
│   ├── auth/              # Authentication endpoints
│   └── stream/            # Streaming endpoints
├── components/            # React components
│   ├── ControlPanel/      # Training control UI
│   ├── errors/            # Error boundaries
│   ├── feedbacks/         # Modal feedback components
│   ├── helper-screens/    # Loading/starter screens
│   ├── layout/            # Layout components
│   ├── shared/            # Reusable UI components
│   └── ui/                # UI feature components
├── config/                # Centralized configuration
│   ├── app.config.ts      # App-wide settings
│   ├── camera.config.ts   # Camera perspectives
│   ├── questions.config.ts # Question database
│   └── tasks.config.ts    # Training tasks
├── features/              # Feature modules
│   ├── camera/            # Camera control
│   ├── explosion/         # Building explosion
│   ├── feedback/          # Modal feedback
│   ├── layers/            # Layer visibility
│   ├── messaging/         # UE5 communication
│   ├── onboarding/        # Loading/starter screens
│   ├── questions/         # Question handling
│   ├── streaming/         # Stream management
│   └── training/          # Training flow
├── lib/                   # Utilities
│   ├── events/            # Event bus system
│   ├── performance/       # Performance utilities
│   ├── logger.ts          # Logging
│   └── messageTypes.ts    # Message definitions
├── services/              # Service layer
│   ├── session.service.ts # Session management
│   ├── stream.service.ts  # Stream API calls
│   └── training.service.ts # Training utilities
├── store/                 # Redux store
│   ├── slices/            # Redux slices
│   ├── hooks.ts           # Typed hooks
│   └── selectors.ts       # Memoized selectors
└── types/                 # Type definitions
    ├── training.types.ts
    ├── messages.types.ts
    └── ui.types.ts
```

## Getting Started

### Prerequisites

- Node.js 20+ (required for Next.js 16)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Testing

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage
```

## Architecture

### State Management

Redux Toolkit is used for global state management. The store is divided into:

- **trainingSlice**: Training progress, tools, camera, layers
- **uiSlice**: UI state, modals, theme
- **connectionSlice**: Stream connection status

Use the `useReduxSync` hook to bridge existing hooks with Redux state.

### Feature Modules

Each feature is self-contained with:
- Components
- Hooks
- Types
- Index exports

Import from feature modules:
```typescript
import { useMessageBus } from '@/app/features/messaging'
import { QuestionModal } from '@/app/features/questions'
```

### Event Bus

Decoupled pub/sub communication:
```typescript
import { eventBus, useEventBus } from '@/app/lib/events'

// Subscribe
useEventBus('training:started', (data) => {
  console.log('Training started:', data.taskIndex)
})

// Emit
eventBus.emit('training:started', { taskIndex: 0 })
```

### Services

API calls are abstracted through services:
```typescript
import { streamService, sessionService } from '@/app/services'

const result = await streamService.getCredentials()
if (result.success) {
  console.log(result.data.environmentId)
}
```

### Logging

Enhanced logger with child loggers and timing:
```typescript
import { logger, getLogger } from '@/app/lib/logger'

const log = getLogger('MyComponent')
log.info({ userId: '123' }, 'User action')

const end = logger.time('operation')
// ... work
end() // Logs duration
```

## Environment Variables

```env
# PureWeb Configuration
NEXT_PUBLIC_PUREWEB_PROJECT_ID=
NEXT_PUBLIC_PUREWEB_MODEL_ID=
PUREWEB_PROJECT_CLIENT_ID=
PUREWEB_PROJECT_CLIENT_SECRET=

# Authentication
JWT_SECRET=
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage |

## License

Private - All rights reserved
