/**
 * Vitest Test Setup
 *
 * Global test configuration and mocks.
 */

import '@testing-library/jest-dom'
import { vi, afterEach } from 'vitest'

// =============================================================================
// Global Mocks
// =============================================================================

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  },
})

// Mock performance.now for timing tests
const mockPerformanceNow = vi.fn(() => Date.now())
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
  },
})

// =============================================================================
// Next.js Mocks
// =============================================================================

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />
  },
}))

// =============================================================================
// Console Mocking (Optional - suppress expected warnings)
// =============================================================================

// Uncomment to suppress specific console warnings during tests
// const originalWarn = console.warn
// console.warn = (...args) => {
//   if (args[0]?.includes('Expected warning')) return
//   originalWarn(...args)
// }

// =============================================================================
// Cleanup
// =============================================================================

afterEach(() => {
  vi.clearAllMocks()
})
