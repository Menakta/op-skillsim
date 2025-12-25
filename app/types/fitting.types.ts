/**
 * Fitting Options Types
 *
 * Types for fitting options stored in Supabase.
 * Matches the fitting_options table schema.
 */

// =============================================================================
// Fitting Option - Database Schema
// =============================================================================

export interface FittingOption {
  id: number
  fitting_id: string
  name: string
  description: string | null
  is_correct: boolean
  nzs3500_reference: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

// =============================================================================
// Fitting Option - Insert Payload
// =============================================================================

export interface FittingOptionInsert {
  fitting_id: string
  name: string
  description?: string
  is_correct: boolean
  nzs3500_reference?: string
  image_url?: string
}

// =============================================================================
// Fitting Option - Update Payload
// =============================================================================

export interface FittingOptionUpdate {
  name?: string
  description?: string
  is_correct?: boolean
  nzs3500_reference?: string
  image_url?: string
}

// =============================================================================
// API Response Types
// =============================================================================

export interface FittingOptionsResponse {
  success: boolean
  fittings?: FittingOption[]
  error?: string
}

export interface FittingOptionResponse {
  success: boolean
  fitting?: FittingOption
  error?: string
}
