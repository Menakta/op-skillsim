/**
 * Phone Number Validation Utility
 *
 * Uses libphonenumber-js (Google's libphonenumber port) for comprehensive
 * international phone number validation supporting all countries.
 */

import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  CountryCode,
  getCountries,
  getCountryCallingCode,
} from 'libphonenumber-js'

export interface PhoneValidationResult {
  isValid: boolean
  error?: string
  formattedNumber?: string // E.164 format (e.g., +64211234567)
  nationalNumber?: string // National format (e.g., 021 123 4567)
  countryCode?: CountryCode // Country code (e.g., NZ, US, AU)
  countryCallingCode?: string // Calling code (e.g., 64, 1, 61)
}

/**
 * Validates a phone number for any country.
 *
 * @param phoneNumber - The phone number to validate (can be with or without country code)
 * @param defaultCountry - Optional default country code if phone doesn't include one (e.g., 'NZ', 'US')
 * @returns Validation result with formatted number if valid
 *
 * @example
 * // With country code prefix
 * validatePhoneNumber('+64211234567') // NZ number
 * validatePhoneNumber('+14155551234') // US number
 *
 * // With default country
 * validatePhoneNumber('0211234567', 'NZ') // Will parse as NZ number
 */
export function validatePhoneNumber(
  phoneNumber: string,
  defaultCountry?: CountryCode
): PhoneValidationResult {
  // Trim whitespace
  const cleaned = phoneNumber.trim()

  if (!cleaned) {
    return {
      isValid: false,
      error: 'Phone number is required',
    }
  }

  try {
    // Parse the phone number
    const parsedNumber = parsePhoneNumberFromString(cleaned, defaultCountry)

    if (!parsedNumber) {
      return {
        isValid: false,
        error: 'Invalid phone number format. Please include your country code (e.g., +64 for New Zealand)',
      }
    }

    // Validate the parsed number
    if (!parsedNumber.isValid()) {
      // Provide more specific error messages
      if (!parsedNumber.isPossible()) {
        const nationalNumber = parsedNumber.nationalNumber
        if (nationalNumber.length < 4) {
          return {
            isValid: false,
            error: 'Phone number is too short',
          }
        }
        if (nationalNumber.length > 15) {
          return {
            isValid: false,
            error: 'Phone number is too long',
          }
        }
      }
      return {
        isValid: false,
        error: `Invalid phone number for ${parsedNumber.country || 'the specified country'}`,
      }
    }

    // Return success with formatted versions
    return {
      isValid: true,
      formattedNumber: parsedNumber.format('E.164'), // +64211234567
      nationalNumber: parsedNumber.formatNational(), // 021 123 4567
      countryCode: parsedNumber.country,
      countryCallingCode: parsedNumber.countryCallingCode,
    }
  } catch {
    return {
      isValid: false,
      error: 'Invalid phone number format. Please include your country code (e.g., +64 for New Zealand)',
    }
  }
}

/**
 * Quick validation check - returns boolean only.
 * Use this for simple validation without needing formatted output.
 *
 * @param phoneNumber - The phone number to validate
 * @param defaultCountry - Optional default country code
 */
export function isPhoneNumberValid(
  phoneNumber: string,
  defaultCountry?: CountryCode
): boolean {
  try {
    return isValidPhoneNumber(phoneNumber.trim(), defaultCountry)
  } catch {
    return false
  }
}

/**
 * Format a phone number to E.164 format if valid.
 * Returns null if the number is invalid.
 *
 * @param phoneNumber - The phone number to format
 * @param defaultCountry - Optional default country code
 */
export function formatToE164(
  phoneNumber: string,
  defaultCountry?: CountryCode
): string | null {
  try {
    const parsed = parsePhoneNumberFromString(phoneNumber.trim(), defaultCountry)
    if (parsed && parsed.isValid()) {
      return parsed.format('E.164')
    }
    return null
  } catch {
    return null
  }
}

/**
 * Get a list of all supported country codes with their calling codes.
 * Useful for building country selector dropdowns.
 */
export function getSupportedCountries(): Array<{
  code: CountryCode
  callingCode: string
}> {
  return getCountries().map((country) => ({
    code: country,
    callingCode: getCountryCallingCode(country),
  }))
}

/**
 * Common country codes for quick reference
 */
export const COMMON_COUNTRIES: Array<{
  code: CountryCode
  name: string
  callingCode: string
  placeholder: string
}> = [
  { code: 'NZ', name: 'New Zealand', callingCode: '64', placeholder: '+64 21 123 4567' },
  { code: 'AU', name: 'Australia', callingCode: '61', placeholder: '+61 412 345 678' },
  { code: 'US', name: 'United States', callingCode: '1', placeholder: '+1 415 555 1234' },
  { code: 'GB', name: 'United Kingdom', callingCode: '44', placeholder: '+44 7911 123456' },
  { code: 'CA', name: 'Canada', callingCode: '1', placeholder: '+1 416 555 1234' },
  { code: 'IN', name: 'India', callingCode: '91', placeholder: '+91 98765 43210' },
  { code: 'PH', name: 'Philippines', callingCode: '63', placeholder: '+63 917 123 4567' },
  { code: 'SG', name: 'Singapore', callingCode: '65', placeholder: '+65 9123 4567' },
  { code: 'MY', name: 'Malaysia', callingCode: '60', placeholder: '+60 12 345 6789' },
  { code: 'JP', name: 'Japan', callingCode: '81', placeholder: '+81 90 1234 5678' },
  { code: 'CN', name: 'China', callingCode: '86', placeholder: '+86 139 1234 5678' },
  { code: 'KR', name: 'South Korea', callingCode: '82', placeholder: '+82 10 1234 5678' },
  { code: 'DE', name: 'Germany', callingCode: '49', placeholder: '+49 151 1234 5678' },
  { code: 'FR', name: 'France', callingCode: '33', placeholder: '+33 6 12 34 56 78' },
  { code: 'IT', name: 'Italy', callingCode: '39', placeholder: '+39 312 345 6789' },
  { code: 'ES', name: 'Spain', callingCode: '34', placeholder: '+34 612 34 56 78' },
  { code: 'BR', name: 'Brazil', callingCode: '55', placeholder: '+55 11 91234 5678' },
  { code: 'MX', name: 'Mexico', callingCode: '52', placeholder: '+52 55 1234 5678' },
  { code: 'ZA', name: 'South Africa', callingCode: '27', placeholder: '+27 82 123 4567' },
  { code: 'AE', name: 'United Arab Emirates', callingCode: '971', placeholder: '+971 50 123 4567' },
]
