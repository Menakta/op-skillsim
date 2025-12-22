'use client'

/**
 * Table Components
 *
 * Reusable table components for displaying data in the teacher dashboard.
 */

import { ReactNode } from 'react'

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        {children}
      </table>
    </div>
  )
}

interface TableHeaderProps {
  children: ReactNode
}

export function TableHeader({ children }: TableHeaderProps) {
  return (
    <thead className="bg-gray-900/50">
      {children}
    </thead>
  )
}

interface TableBodyProps {
  children: ReactNode
}

export function TableBody({ children }: TableBodyProps) {
  return <tbody className="divide-y divide-gray-700">{children}</tbody>
}

interface TableRowProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function TableRow({ children, className = '', onClick }: TableRowProps) {
  return (
    <tr
      className={`hover:bg-gray-700/50 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

interface TableHeadProps {
  children: ReactNode
  className?: string
}

export function TableHead({ children, className = '' }: TableHeadProps) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  )
}

interface TableCellProps {
  children: ReactNode
  className?: string
}

export function TableCell({ children, className = '' }: TableCellProps) {
  return (
    <td className={`px-4 py-4 text-sm text-gray-300 ${className}`}>
      {children}
    </td>
  )
}
