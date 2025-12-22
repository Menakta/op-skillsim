# Architecture Guide

This document describes the architecture patterns and conventions used in OP SkillSim.

## Overview

The application is built with a modular, feature-based architecture that prioritizes:

- **Separation of Concerns**: Features are self-contained modules
- **Type Safety**: Comprehensive TypeScript types throughout
- **Testability**: Decoupled components that are easy to test
- **Scalability**: Patterns that support team growth

## Core Principles

### 1. Feature-Based Organization

Each feature encapsulates related functionality:

```
features/
└── training/
    ├── components/       # UI components
    ├── hooks/           # React hooks
    ├── types.ts         # TypeScript types
    └── index.ts         # Public exports
```

**Benefits:**
- Clear ownership boundaries
- Easier code navigation
- Reduced merge conflicts
- Independent feature development

### 2. Unidirectional Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Redux     │────▶│  Components │────▶│   Actions   │
│   Store     │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                                       │
       └───────────────────────────────────────┘
```

State flows from Redux store to components, and actions flow back.

### 3. Service Layer

API calls are abstracted through services:

```typescript
// services/stream.service.ts
export const streamService = {
  async getCredentials(): Promise<ServiceResult<StreamCredentials>> {
    // Implementation
  }
}
```

**Benefits:**
- Centralized API logic
- Easy mocking for tests
- Consistent error handling
- Type-safe responses

## State Management

### Redux Store Structure

```typescript
{
  training: {
    mode: 'cinematic' | 'training',
    progress: number,
    currentTool: ToolName,
    // ...
  },
  ui: {
    activeScreen: string,
    modals: { [key: string]: boolean },
    theme: 'light' | 'dark',
  },
  connection: {
    status: 'disconnected' | 'connecting' | 'connected',
    // ...
  }
}
```

### Selector Patterns

Use memoized selectors for derived data:

```typescript
// store/selectors.ts
export const selectTrainingProgress = createSelector(
  [(state: RootState) => state.training],
  (training) => ({
    percentage: calculateProgress(training),
    phase: getPhase(training.currentTaskIndex),
  })
)
```

### Bridging Hooks with Redux

The `useReduxSync` hook bridges existing hooks with Redux:

```typescript
// In StreamingApp.tsx
const training = useTrainingMessagesComposite(emitter, messageSubject)
useReduxSync(training) // Syncs hook state to Redux
```

## Event System

### Event Bus

Decoupled communication between features:

```typescript
// Emitting
eventBus.emit('training:completed', { totalTasks: 6 })

// Subscribing
eventBus.on('training:completed', (data) => {
  analytics.track('training_completed', data)
})
```

### Typed Events

Events are fully typed:

```typescript
interface AppEvents {
  'training:started': { taskIndex: number }
  'training:completed': { totalTasks: number }
  // ...
}
```

## Component Patterns

### Shared Components

Reusable UI components in `components/shared/`:

```typescript
import { Button, BaseModal } from '@/app/components/shared'

<Button variant="primary" onClick={handleClick}>
  Start Training
</Button>
```

### Modal Composition

Modals use BaseModal for consistent behavior:

```typescript
<BaseModal
  isOpen={isOpen}
  onClose={handleClose}
  title="Success"
>
  <ModalMessage message="Task completed!" />
  <ModalFooter>
    <Button onClick={handleContinue}>Continue</Button>
  </ModalFooter>
</BaseModal>
```

### Error Boundaries

Use error boundaries to catch rendering errors:

```typescript
import { ErrorBoundary, StreamErrorBoundary } from '@/app/components/errors'

<StreamErrorBoundary onReconnect={handleReconnect}>
  <StreamingComponent />
</StreamErrorBoundary>
```

## Performance

### Memoization

Use memoization for expensive computations:

```typescript
import { useShallowMemo, useDebouncedValue } from '@/app/lib/performance'

const stableValue = useShallowMemo(complexObject)
const debouncedSearch = useDebouncedValue(searchTerm, 300)
```

### Virtual Lists

For long lists, use virtualization:

```typescript
import { VirtualList } from '@/app/lib/performance'

<VirtualList
  items={layers}
  itemHeight={40}
  containerHeight={400}
  renderItem={(layer) => <LayerItem layer={layer} />}
/>
```

### Lazy Loading

Lazy load heavy components:

```typescript
import { lazyLoadWithPreload } from '@/app/lib/performance'

const { Component: Chart, preload } = lazyLoadWithPreload(
  () => import('./Chart')
)

// Preload on hover
<button onMouseEnter={preload}>Show Chart</button>
```

## Testing

### Unit Tests

Test pure functions and utilities:

```typescript
describe('trainingService', () => {
  it('should calculate progress correctly', () => {
    const progress = trainingService.calculateProgress(3)
    expect(progress.percentage).toBe(50)
  })
})
```

### Component Tests

Test components with React Testing Library:

```typescript
describe('Button', () => {
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)

    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalled()
  })
})
```

### Mocking

Mock services and external dependencies:

```typescript
vi.mock('@/app/services', () => ({
  streamService: {
    getCredentials: vi.fn().mockResolvedValue({
      success: true,
      data: { environmentId: 'test-env' }
    })
  }
}))
```

## Logging

### Logger Usage

```typescript
import { getLogger } from '@/app/lib/logger'

const log = getLogger('ComponentName')

log.debug('Debug info')
log.info({ userId }, 'User action')
log.warn('Warning message')
log.error({ error }, 'Error occurred')
```

### Performance Timing

```typescript
const end = logger.time('expensive-operation')
await expensiveOperation()
end() // Logs: "⏱ expensive-operation" with duration
```

## Configuration

### Centralized Config

All configuration in `app/config/`:

```typescript
import { TASK_SEQUENCE, CAMERA_PERSPECTIVES } from '@/app/config'
```

### Environment Variables

```typescript
// Access via process.env
const projectId = process.env.NEXT_PUBLIC_PUREWEB_PROJECT_ID
```

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `Button.tsx` |
| Hooks | camelCase with `use` prefix | `useTrainingState.ts` |
| Services | kebab-case with `.service` | `stream.service.ts` |
| Types | kebab-case with `.types` | `training.types.ts` |
| Config | kebab-case with `.config` | `app.config.ts` |
| Tests | Same as source with `.test` | `Button.test.tsx` |
