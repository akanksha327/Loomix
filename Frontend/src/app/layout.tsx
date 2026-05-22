import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LOOMIX — Digital Community OS",
  description: "The operating system for digital communities. Built for the next era of social.",
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "LOOMIX",
    description: "Digital Community OS",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var settingsStr = localStorage.getItem('loomix_settings');
                  if (settingsStr) {
                    var settings = JSON.parse(settingsStr);
                    
                    // Theme
                    var theme = settings.theme || 'system';
                    var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    if (isDark) {
                      document.documentElement.classList.add('dark');
                      document.documentElement.classList.remove('light');
                    } else {
                      document.documentElement.classList.add('light');
                      document.documentElement.classList.remove('dark');
                    }
                    
                    // Accent Color
                    if (settings.accentColor) {
                      var color = settings.accentColor;
                      document.documentElement.style.setProperty('--primary', color);
                      document.documentElement.style.setProperty('--accent', color);
                      document.documentElement.style.setProperty('--ring', color);
                      document.documentElement.style.setProperty('--chart-1', color);
                      document.documentElement.style.setProperty('--sidebar-primary', color);
                      document.documentElement.style.setProperty('--sidebar-ring', color);
                      
                      // RGB calculations
                      var hex = color.replace('#', '');
                      var r = parseInt(hex.substring(0, 2), 16);
                      var g = parseInt(hex.substring(2, 4), 16);
                      var b = parseInt(hex.substring(4, 6), 16);
                      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                        document.documentElement.style.setProperty('--sidebar-accent', 'rgba(' + r + ',' + g + ',' + b + ',0.08)');
                        document.documentElement.style.setProperty('--accent-border', 'rgba(' + r + ',' + g + ',' + b + ',0.3)');
                        document.documentElement.style.setProperty('--primary-rgb', r + ',' + g + ',' + b);
                      }
                    }
                    
                    // Density
                    var density = settings.uiDensity || 'default';
                    document.documentElement.classList.remove('density-compact', 'density-comfortable');
                    if (density !== 'default') {
                      document.documentElement.classList.add('density-' + density);
                    }
                    
                    // Motion
                    var motion = settings.motionEffects !== false;
                    if (!motion) {
                      document.documentElement.classList.add('motion-reduce');
                    } else {
                      document.documentElement.classList.remove('motion-reduce');
                    }
                  } else {
                    // No settings saved yet — default to dark
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  }
                } catch (e) {
                  console.error('Settings parse error:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased noise`}
        style={{ background: 'var(--background)', color: 'var(--foreground)' }}
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

