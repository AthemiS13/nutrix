import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ViewportFixProvider } from "./ViewportFixProvider";

export const metadata: Metadata = {
  title: "Nutrix - Calorie & Macro Tracker",
  description: "Track your calories and macros with ease",
  icons: {
    icon: [{ url: '/nutrix.svg', type: 'image/svg+xml' }],
    shortcut: ['/nutrix.svg'],
    // iOS requires PNG for home screen icons; ensure this file exists (180x180 recommended)
    apple: [{ url: '/nutrix-logo.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nutrix',
  },
  // Add themeColor so iOS/Android status bar / standalone background uses the app color
  themeColor: '#0f172a',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'auto',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-zinc-950 m-0 p-0">
        <ViewportFixProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ViewportFixProvider>
      </body>
    </html>
  );
}
