/**
 * Admin Utils
 *
 * Shared utility functions for admin pages.
 */

/**
 * Format a date string to a human-readable format
 */
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format seconds to a human-readable time string
 */
export function formatTime(seconds: number): string {
  if (!seconds || seconds === 0) return '0s'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}

/**
 * Format milliseconds to a human-readable time string
 */
export function formatTimeMs(ms: number): string {
  if (!ms || ms === 0) return '0s'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

/**
 * Format a timestamp to a relative time string (e.g., "2h ago")
 */
export function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

/**
 * Get initials from a name
 */
export function getInitials(name: string, maxLength = 2): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, maxLength)
    .toUpperCase()
}

/**
 * Format a phase string to title case with spaces
 */
export function formatPhase(phase: string): string {
  return phase
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

// =============================================================================
// PDF Export Utilities
// =============================================================================

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ExportColumn<T> {
  key: string
  header: string
  getValue?: (item: T) => unknown
  width?: number
}

export interface PDFExportOptions {
  title?: string
  subtitle?: string
  orientation?: 'portrait' | 'landscape'
}

/**
 * Load an image and convert to base64
 */
async function loadImageAsBase64(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0)
      const dataUrl = canvas.toDataURL('image/png')
      resolve(dataUrl)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    // Use absolute URL based on current origin
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    img.src = `${baseUrl}${path}`
  })
}

/**
 * Export data to PDF and trigger download
 */
export async function exportToPDF<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  options: PDFExportOptions = {}
): Promise<void> {
  const {
    title = 'Export',
    subtitle,
    orientation = 'landscape'
  } = options

  // Create PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Try to load the logo
  let logoBase64: string | null = null
  try {
    logoBase64 = await loadImageAsBase64('/logos/Dark_Logo.png')
  } catch (error) {
    console.warn('Could not load logo for PDF:', error)
  }

  // Add title
  doc.setFontSize(18)
  doc.setTextColor(57, 190, 174) // #39BEAE
  doc.text(title, 14, 20)

  // Add subtitle if provided
  let startY = 28
  if (subtitle) {
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(subtitle, 14, startY)
    startY += 8
  }

  // Add timestamp
  doc.setFontSize(9)
  doc.setTextColor(128)
  const timestamp = new Date().toLocaleString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  doc.text(`Generated: ${timestamp}`, 14, startY)
  startY += 6

  // Add total count
  doc.text(`Total Records: ${data.length}`, 14, startY)
  startY += 8

  // Prepare table data
  const headers = columns.map(col => col.header)
  const rows = data.map(item =>
    columns.map(col => {
      const value = col.getValue
        ? col.getValue(item)
        : (item as Record<string, unknown>)[col.key]
      return value === null || value === undefined ? '' : String(value)
    })
  )

  // Generate table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: startY,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [57, 190, 174], // #39BEAE
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  })

  // Add footer with page numbers and logo
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )

    // Add logo to footer (right side)
    if (logoBase64) {
      // Logo dimensions: width ~40mm, maintain aspect ratio
      const logoWidth = 35
      const logoHeight = 8
      doc.addImage(
        logoBase64,
        'PNG',
        pageWidth - 14 - logoWidth,
        pageHeight - 14,
        logoWidth,
        logoHeight
      )
    }
  }

  // Save the PDF
  doc.save(filename)
}

// =============================================================================
// Chart Export Utilities
// =============================================================================

export interface ChartExportOptions {
  title: string
  subtitle?: string
  orientation?: 'portrait' | 'landscape'
}

/**
 * Export a chart element to PDF by capturing it as an image
 */
export async function exportChartToPDF(
  chartElement: HTMLElement,
  filename: string,
  options: ChartExportOptions
): Promise<void> {
  const { title, subtitle, orientation = 'landscape' } = options

  // Dynamically import html2canvas
  const html2canvas = (await import('html2canvas')).default

  // Clone the element to apply export-specific styles without affecting the UI
  const clone = chartElement.cloneNode(true) as HTMLElement
  clone.style.position = 'absolute'
  clone.style.left = '-9999px'
  clone.style.top = '0'
  clone.style.width = `${chartElement.offsetWidth}px`
  clone.style.backgroundColor = '#1a1a2e'
  clone.style.padding = '16px'
  clone.style.borderRadius = '8px'

  // Apply dark theme colors to all text elements in the clone
  const allElements = clone.querySelectorAll('*')
  allElements.forEach((el) => {
    const element = el as HTMLElement
    const computedStyle = window.getComputedStyle(element)

    // Make text visible on dark background
    if (computedStyle.color === 'rgb(0, 0, 0)' ||
        computedStyle.color === 'rgba(0, 0, 0, 0)' ||
        computedStyle.color.includes('var(')) {
      element.style.color = '#e5e5e5'
    }

    // Ensure text elements have proper color
    if (element.tagName === 'P' || element.tagName === 'SPAN' ||
        element.tagName === 'DIV' || element.tagName === 'TEXT') {
      const currentColor = computedStyle.color
      // If color is very dark or transparent, make it light
      if (currentColor === 'rgb(0, 0, 0)' || currentColor.startsWith('rgba(0, 0, 0')) {
        element.style.color = '#e5e5e5'
      }
    }
  })

  // Append clone to body temporarily
  document.body.appendChild(clone)

  // Wait for fonts and styles to apply
  await new Promise(resolve => setTimeout(resolve, 100))

  // Capture the chart as an image with proper settings
  const canvas = await html2canvas(clone, {
    backgroundColor: '#1a1a2e',
    scale: 2,
    logging: false,
    useCORS: true,
    allowTaint: true,
    width: clone.scrollWidth,
    height: clone.scrollHeight,
    windowWidth: clone.scrollWidth,
    windowHeight: clone.scrollHeight,
  })

  // Remove the clone
  document.body.removeChild(clone)

  const imgData = canvas.toDataURL('image/png')

  // Create PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Try to load the logo
  let logoBase64: string | null = null
  try {
    logoBase64 = await loadImageAsBase64('/logos/Dark_Logo.png')
  } catch (error) {
    console.warn('Could not load logo for PDF:', error)
  }

  // Add title
  doc.setFontSize(18)
  doc.setTextColor(57, 190, 174)
  doc.text(title, 14, 20)

  // Add subtitle if provided
  let startY = 28
  if (subtitle) {
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(subtitle, 14, startY)
    startY += 8
  }

  // Add timestamp
  doc.setFontSize(9)
  doc.setTextColor(128)
  const timestamp = new Date().toLocaleString('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  doc.text(`Generated: ${timestamp}`, 14, startY)
  startY += 10

  // Calculate image dimensions to fit the page with more space
  const maxWidth = pageWidth - 28
  const maxHeight = pageHeight - startY - 20

  const imgWidth = canvas.width
  const imgHeight = canvas.height
  const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight)

  const finalWidth = imgWidth * ratio
  const finalHeight = imgHeight * ratio

  // Center the image horizontally
  const xOffset = (pageWidth - finalWidth) / 2

  // Add the chart image
  doc.addImage(imgData, 'PNG', xOffset, startY, finalWidth, finalHeight)

  // Add footer
  doc.setFontSize(8)
  doc.setTextColor(128)
  doc.text('Page 1 of 1', pageWidth / 2, pageHeight - 8, { align: 'center' })

  // Add logo to footer
  if (logoBase64) {
    const logoWidth = 35
    const logoHeight = 8
    doc.addImage(
      logoBase64,
      'PNG',
      pageWidth - 14 - logoWidth,
      pageHeight - 12,
      logoWidth,
      logoHeight
    )
  }

  // Save the PDF
  doc.save(filename)
}
