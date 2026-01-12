import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { QueryProvider } from "@/lib/providers/query-provider"
import { ThemeProvider } from "@/context/theme-context"
import { generatePartnerMetadata } from "@/lib/metadata"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export async function generateMetadata(): Promise<Metadata> {
  return generatePartnerMetadata()
}

// Inline script to suppress Vapi/Daily SDK "ejection" errors before React hydration
const suppressSdkErrorsScript = `
(function() {
  var patterns = ['meeting has ended', 'ejection', 'ended due to ejection'];
  function shouldSuppress(msg) {
    if (!msg) return false;
    var str = String(msg).toLowerCase();
    return patterns.some(function(p) { return str.indexOf(p) !== -1; });
  }
  var origError = console.error;
  console.error = function() {
    for (var i = 0; i < arguments.length; i++) {
      if (shouldSuppress(arguments[i]) || (arguments[i] && shouldSuppress(arguments[i].message))) {
        return;
      }
    }
    return origError.apply(console, arguments);
  };
  window.addEventListener('error', function(e) {
    if (shouldSuppress(e.message) || shouldSuppress(e.error)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);
  window.addEventListener('unhandledrejection', function(e) {
    if (shouldSuppress(e.reason)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Suppress Vapi/Daily SDK errors before React/Next.js error overlay initializes */}
        <script dangerouslySetInnerHTML={{ __html: suppressSdkErrorsScript }} />
      </head>
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="system" storageKey="genius365-theme">
          <QueryProvider>
            {children}
            <Toaster position="top-right" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
