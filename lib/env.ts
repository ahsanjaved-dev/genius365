function getEnvVar(key: string, required = true): string {
  const value = process.env[key]
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value || ""
}

export const env = {
  supabaseUrl: getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),

  appUrl: getEnvVar("NEXT_PUBLIC_APP_URL", false) || "http://localhost:3000",

  stripeSecretKey: getEnvVar("STRIPE_SECRET_KEY", false),
  stripePublishableKey: getEnvVar("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", false),

  isDev: process.env.NODE_ENV === "development",
  isProd: process.env.NODE_ENV === "production",
}
