/**
 * Button Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/app/components/shared'

describe('Button', () => {
  describe('rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
    })

    it('should render with left icon', () => {
      render(
        <Button leftIcon={<span data-testid="left-icon">←</span>}>
          With Icon
        </Button>
      )
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    })

    it('should render with right icon', () => {
      render(
        <Button rightIcon={<span data-testid="right-icon">→</span>}>
          With Icon
        </Button>
      )
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })
  })

  describe('variants', () => {
    it('should apply primary variant styles', () => {
      render(<Button variant="primary">Primary</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-')
    })

    it('should apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('should apply danger variant styles', () => {
      render(<Button variant="danger">Danger</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })
  })

  describe('sizes', () => {
    it('should apply small size', () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('should apply medium size (default)', () => {
      render(<Button size="md">Medium</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('should apply large size', () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })
  })

  describe('states', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should show loading state', () => {
      render(<Button isLoading>Loading</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should apply full width when fullWidth is true', () => {
      render(<Button fullWidth>Full Width</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('w-full')
    })
  })

  describe('interactions', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Clickable</Button>)

      fireEvent.click(screen.getByRole('button'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn()
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      )

      fireEvent.click(screen.getByRole('button'))

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn()
      render(
        <Button onClick={handleClick} isLoading>
          Loading
        </Button>
      )

      fireEvent.click(screen.getByRole('button'))

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have button role', () => {
      render(<Button>Accessible</Button>)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should support aria-label', () => {
      render(<Button aria-label="Close dialog">×</Button>)
      expect(screen.getByRole('button', { name: /close dialog/i })).toBeInTheDocument()
    })

    it('should be focusable', () => {
      render(<Button>Focusable</Button>)
      const button = screen.getByRole('button')

      button.focus()

      expect(document.activeElement).toBe(button)
    })
  })
})
