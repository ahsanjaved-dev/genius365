/**
 * Voice Configuration for VAPI and Retell
 * Centralized voice definitions for AI agents
 */

// ============================================================================
// TYPES
// ============================================================================

export interface VoiceOption {
  /** Unique identifier for the voice */
  id: string
  /** Display name */
  name: string
  /** Gender of the voice */
  gender: "Male" | "Female"
  /** Accent or origin */
  accent: string
  /** Age of the voice persona */
  age: number
  /** Brief description of voice characteristics */
  characteristics: string
  /** Provider-specific voice ID (if different from id) */
  providerId?: string
}

export interface VoiceConfig {
  provider: "vapi" | "retell"
  voices: VoiceOption[]
}

// ============================================================================
// VAPI VOICES
// Reference: https://docs.vapi.ai/voices
// IMPORTANT: Voice IDs must be capitalized exactly as VAPI expects
// Available: Elliot, Kylie, Rohan, Lily, Savannah, Hana, Neha, Cole, Harry, Paige, Spencer, Leah, Tara, Jess, Leo, Dan, Mia, Zac, Zoe
// ============================================================================

export const VAPI_VOICES: VoiceOption[] = [
  {
    id: "Rohan",
    name: "Rohan",
    gender: "Male",
    accent: "Indian American",
    age: 24,
    characteristics: "Bright, optimistic, cheerful, energetic",
  },
  {
    id: "Neha",
    name: "Neha",
    gender: "Female",
    accent: "Indian American",
    age: 30,
    characteristics: "Professional, charming",
  },
  {
    id: "Hana",
    name: "Hana",
    gender: "Female",
    accent: "American",
    age: 22,
    characteristics: "Soft, soothing, gentle",
  },
  {
    id: "Harry",
    name: "Harry",
    gender: "Male",
    accent: "American",
    age: 24,
    characteristics: "Clear, energetic, professional",
  },
  {
    id: "Elliot",
    name: "Elliot",
    gender: "Male",
    accent: "Canadian",
    age: 25,
    characteristics: "Soothing, friendly, professional",
  },
  {
    id: "Lily",
    name: "Lily",
    gender: "Female",
    accent: "Asian American",
    age: 25,
    characteristics: "Bright personality, bubbly, cheerful",
  },
  {
    id: "Paige",
    name: "Paige",
    gender: "Female",
    accent: "American",
    age: 26,
    characteristics: "Deeper tone, calming, professional",
  },
  {
    id: "Cole",
    name: "Cole",
    gender: "Male",
    accent: "American",
    age: 22,
    characteristics: "Deeper tone, calming, professional",
  },
  {
    id: "Savannah",
    name: "Savannah",
    gender: "Female",
    accent: "American (Southern)",
    age: 25,
    characteristics: "Southern American accent",
  },
  {
    id: "Spencer",
    name: "Spencer",
    gender: "Female",
    accent: "American",
    age: 26,
    characteristics: "Energetic, quippy, lighthearted, cheeky, amused",
  },
  {
    id: "Kylie",
    name: "Kylie",
    gender: "Female",
    accent: "American",
    age: 24,
    characteristics: "Friendly, approachable, warm",
  },
  {
    id: "Leah",
    name: "Leah",
    gender: "Female",
    accent: "American",
    age: 25,
    characteristics: "Natural, conversational, relatable",
  },
  {
    id: "Tara",
    name: "Tara",
    gender: "Female",
    accent: "American",
    age: 27,
    characteristics: "Confident, articulate, professional",
  },
  {
    id: "Jess",
    name: "Jess",
    gender: "Female",
    accent: "American",
    age: 23,
    characteristics: "Youthful, energetic, upbeat",
  },
  {
    id: "Leo",
    name: "Leo",
    gender: "Male",
    accent: "American",
    age: 28,
    characteristics: "Confident, charismatic, engaging",
  },
  {
    id: "Dan",
    name: "Dan",
    gender: "Male",
    accent: "American",
    age: 30,
    characteristics: "Trustworthy, clear, professional",
  },
  {
    id: "Mia",
    name: "Mia",
    gender: "Female",
    accent: "American",
    age: 24,
    characteristics: "Sweet, gentle, caring",
  },
  {
    id: "Zac",
    name: "Zac",
    gender: "Male",
    accent: "American",
    age: 26,
    characteristics: "Casual, friendly, laid-back",
  },
  {
    id: "Zoe",
    name: "Zoe",
    gender: "Female",
    accent: "American",
    age: 25,
    characteristics: "Bright, enthusiastic, personable",
  },
]

// ============================================================================
// RETELL VOICES
// Reference: https://docs.retellai.com/api-references/list-voices
// Currently only Adrian is supported
// ============================================================================

export const RETELL_VOICES: VoiceOption[] = [
  {
    id: "11labs-Adrian",
    name: "Adrian",
    gender: "Male",
    accent: "American",
    age: 25, // Young
    characteristics: "Professional, clear, confident voice from ElevenLabs",
    providerId: "11labs-Adrian",
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get available voices for VAPI provider
 */
export function getVapiVoices(): VoiceOption[] {
  return VAPI_VOICES
}

/**
 * Get available voices for Retell provider
 */
export function getRetellVoices(): VoiceOption[] {
  return RETELL_VOICES
}

/**
 * Get voices for a specific provider
 */
export function getVoicesForProvider(provider: "vapi" | "retell"): VoiceOption[] {
  switch (provider) {
    case "vapi":
      return getVapiVoices()
    case "retell":
      return getRetellVoices()
    default:
      return []
  }
}

/**
 * Find a voice by ID for a specific provider
 */
export function findVoiceById(provider: "vapi" | "retell", voiceId: string): VoiceOption | undefined {
  const voices = getVoicesForProvider(provider)
  return voices.find((v) => v.id === voiceId)
}

/**
 * Get the provider-specific voice ID (for API calls)
 */
export function getProviderVoiceId(provider: "vapi" | "retell", voiceId: string): string {
  const voice = findVoiceById(provider, voiceId)
  if (!voice) {
    // Return default voices if not found
    return provider === "vapi" ? "harry" : "11labs-Adrian"
  }
  return voice.providerId || voice.id
}

/**
 * Get the default voice for a provider
 */
export function getDefaultVoice(provider: "vapi" | "retell"): VoiceOption {
  const voices = getVoicesForProvider(provider)
  if (voices.length === 0) {
    // This should never happen, but throw an error to satisfy TypeScript
    throw new Error(`No voices available for provider: ${provider}`)
  }
  return voices[0]! // First voice is default (non-null assertion safe because we checked length)
}

/**
 * Get UI color for voice card based on gender
 */
export function getVoiceCardColor(gender: "Male" | "Female"): { bg: string; text: string } {
  return gender === "Female"
    ? { bg: "bg-pink-100", text: "text-pink-600" }
    : { bg: "bg-blue-100", text: "text-blue-600" }
}

