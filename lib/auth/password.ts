/**
 * Password Policies & Validation
 * Phase 2.1.3: Implement secure password policies
 *
 * Provides password validation, strength checking, and security utilities.
 */

// ============================================================================
// PASSWORD POLICY CONFIGURATION
// ============================================================================

export interface PasswordPolicy {
  minLength: number
  maxLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSymbols: boolean
  preventCommonPasswords: boolean
  preventUserInfo: boolean
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  preventCommonPasswords: true,
  preventUserInfo: true,
}

// ============================================================================
// COMMON PASSWORDS LIST (top 100 most common)
// ============================================================================

const COMMON_PASSWORDS = new Set([
  "password",
  "123456",
  "12345678",
  "qwerty",
  "abc123",
  "monkey",
  "1234567",
  "letmein",
  "trustno1",
  "dragon",
  "baseball",
  "iloveyou",
  "master",
  "sunshine",
  "ashley",
  "bailey",
  "shadow",
  "123123",
  "654321",
  "superman",
  "qazwsx",
  "michael",
  "football",
  "password1",
  "password123",
  "batman",
  "login",
  "starwars",
  "whatever",
  "welcome",
  "admin",
  "admin123",
  "p@ssw0rd",
  "passw0rd",
  "password!",
  "123456789",
  "12345",
  "1234",
  "123",
  "1234567890",
  "000000",
  "111111",
  "121212",
  "1q2w3e",
  "1q2w3e4r",
  "666666",
  "7777777",
  "696969",
  "access",
  "adobe123",
  "azerty",
  "charlie",
  "donald",
  "flower",
  "freedom",
  "hello",
  "hottie",
  "jesus",
  "jordan",
  "killer",
  "loveme",
  "maggie",
  "marina",
  "mustang",
  "nicole",
  "ninja",
  "pass",
  "pepper",
  "princess",
  "qwerty123",
  "ranger",
  "robert",
  "secret",
  "solo",
  "summer",
  "thomas",
  "thunder",
  "tigger",
  "welcome1",
  "zaq1zaq1",
  "fuckyou",
  "asshole",
  "biteme",
  "pussy",
  "cock",
  "dick",
  "shit",
])

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface PasswordValidationResult {
  valid: boolean
  errors: PasswordError[]
  strength: PasswordStrength
  suggestions: string[]
}

export interface PasswordError {
  code: PasswordErrorCode
  message: string
}

export type PasswordErrorCode =
  | "TOO_SHORT"
  | "TOO_LONG"
  | "NO_UPPERCASE"
  | "NO_LOWERCASE"
  | "NO_NUMBER"
  | "NO_SYMBOL"
  | "COMMON_PASSWORD"
  | "CONTAINS_USER_INFO"
  | "TOO_WEAK"

export type PasswordStrength = "very_weak" | "weak" | "fair" | "strong" | "very_strong"

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

/**
 * Validate a password against the security policy.
 */
export function validatePassword(
  password: string,
  userInfo?: { email?: string; firstName?: string; lastName?: string },
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): PasswordValidationResult {
  const errors: PasswordError[] = []
  const suggestions: string[] = []

  // Check length
  if (password.length < policy.minLength) {
    errors.push({
      code: "TOO_SHORT",
      message: `Password must be at least ${policy.minLength} characters`,
    })
    suggestions.push(`Add ${policy.minLength - password.length} more characters`)
  }

  if (password.length > policy.maxLength) {
    errors.push({
      code: "TOO_LONG",
      message: `Password must be no more than ${policy.maxLength} characters`,
    })
  }

  // Check uppercase
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push({
      code: "NO_UPPERCASE",
      message: "Password must contain at least one uppercase letter",
    })
    suggestions.push("Add an uppercase letter (A-Z)")
  }

  // Check lowercase
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push({
      code: "NO_LOWERCASE",
      message: "Password must contain at least one lowercase letter",
    })
    suggestions.push("Add a lowercase letter (a-z)")
  }

  // Check numbers
  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push({
      code: "NO_NUMBER",
      message: "Password must contain at least one number",
    })
    suggestions.push("Add a number (0-9)")
  }

  // Check symbols
  if (policy.requireSymbols && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    errors.push({
      code: "NO_SYMBOL",
      message: "Password must contain at least one special character",
    })
    suggestions.push("Add a special character (!@#$%^&*)")
  }

  // Check common passwords
  if (policy.preventCommonPasswords) {
    const lowerPassword = password.toLowerCase()
    if (COMMON_PASSWORDS.has(lowerPassword)) {
      errors.push({
        code: "COMMON_PASSWORD",
        message: "This password is too common and easily guessable",
      })
      suggestions.push("Choose a more unique password")
    }

    // Check for variations of common passwords
    const normalized = lowerPassword.replace(/[0-9@$!]/g, (c) => {
      const replacements: Record<string, string> = {
        "0": "o",
        "1": "i",
        "3": "e",
        "4": "a",
        "5": "s",
        "@": "a",
        $: "s",
        "!": "i",
      }
      return replacements[c] || c
    })
    if (COMMON_PASSWORDS.has(normalized)) {
      errors.push({
        code: "COMMON_PASSWORD",
        message: "This password is a variation of a common password",
      })
    }
  }

  // Check for user info in password
  if (policy.preventUserInfo && userInfo) {
    const lowerPassword = password.toLowerCase()
    const userInfoParts = [
      userInfo.email?.split("@")[0],
      userInfo.firstName,
      userInfo.lastName,
    ].filter(Boolean) as string[]

    for (const part of userInfoParts) {
      if (part.length >= 3 && lowerPassword.includes(part.toLowerCase())) {
        errors.push({
          code: "CONTAINS_USER_INFO",
          message: "Password should not contain personal information",
        })
        suggestions.push("Remove personal information from password")
        break
      }
    }
  }

  // Calculate strength
  const strength = calculatePasswordStrength(password)

  return {
    valid: errors.length === 0,
    errors,
    strength,
    suggestions: errors.length > 0 ? suggestions : [],
  }
}

// ============================================================================
// PASSWORD STRENGTH CALCULATION
// ============================================================================

/**
 * Calculate the strength of a password.
 * Returns a strength rating and score.
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0

  // Length scoring
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1
  if (password.length >= 20) score += 1

  // Character variety
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) score += 2

  // Bonus for mixed patterns
  if (/[a-z].*[A-Z]|[A-Z].*[a-z]/.test(password)) score += 1
  if (/\d.*[a-zA-Z]|[a-zA-Z].*\d/.test(password)) score += 1

  // Penalty for repeating patterns
  if (/(.)\1{2,}/.test(password)) score -= 2
  if (/^[a-zA-Z]+$/.test(password)) score -= 1
  if (/^[0-9]+$/.test(password)) score -= 2

  // Penalty for sequential patterns
  if (
    /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(
      password
    )
  ) {
    score -= 1
  }
  if (/(?:123|234|345|456|567|678|789|890)/.test(password)) {
    score -= 1
  }

  // Normalize score
  score = Math.max(0, Math.min(10, score))

  // Map to strength levels
  if (score <= 2) return "very_weak"
  if (score <= 4) return "weak"
  if (score <= 6) return "fair"
  if (score <= 8) return "strong"
  return "very_strong"
}

// ============================================================================
// STRENGTH METADATA
// ============================================================================

export const PASSWORD_STRENGTH_INFO: Record<
  PasswordStrength,
  { label: string; color: string; percentage: number }
> = {
  very_weak: { label: "Very Weak", color: "#ef4444", percentage: 20 },
  weak: { label: "Weak", color: "#f97316", percentage: 40 },
  fair: { label: "Fair", color: "#eab308", percentage: 60 },
  strong: { label: "Strong", color: "#22c55e", percentage: 80 },
  very_strong: { label: "Very Strong", color: "#10b981", percentage: 100 },
}

// ============================================================================
// PASSWORD REQUIREMENTS DISPLAY
// ============================================================================

export interface PasswordRequirement {
  id: string
  label: string
  met: boolean
}

/**
 * Get a list of password requirements and their status.
 */
export function getPasswordRequirements(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): PasswordRequirement[] {
  const requirements: PasswordRequirement[] = []

  requirements.push({
    id: "length",
    label: `At least ${policy.minLength} characters`,
    met: password.length >= policy.minLength,
  })

  if (policy.requireUppercase) {
    requirements.push({
      id: "uppercase",
      label: "Contains uppercase letter",
      met: /[A-Z]/.test(password),
    })
  }

  if (policy.requireLowercase) {
    requirements.push({
      id: "lowercase",
      label: "Contains lowercase letter",
      met: /[a-z]/.test(password),
    })
  }

  if (policy.requireNumbers) {
    requirements.push({
      id: "number",
      label: "Contains number",
      met: /[0-9]/.test(password),
    })
  }

  if (policy.requireSymbols) {
    requirements.push({
      id: "symbol",
      label: "Contains special character",
      met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
    })
  }

  return requirements
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a secure random password.
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lowercase = "abcdefghjkmnpqrstuvwxyz"
  const numbers = "23456789"
  const symbols = "!@#$%^&*"

  const allChars = uppercase + lowercase + numbers + symbols

  const getRandomChar = (chars: string): string => {
    const idx = Math.floor(Math.random() * chars.length)
    return chars.charAt(idx)
  }

  // Ensure at least one of each type
  let password =
    getRandomChar(uppercase) +
    getRandomChar(lowercase) +
    getRandomChar(numbers) +
    getRandomChar(symbols)

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += getRandomChar(allChars)
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("")
}
