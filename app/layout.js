// app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "EventX - College Event Platform",
  description: "Join us for amazing hackathons and technical events from all clubs",
  manifest: '/site.webmanifest', // Link to PWA manifest
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', rel: 'icon' }, // Fallback for older browsers
    ],
    apple: [
      { url: '/apple-touch-icon.png' }, // Apple touch icon
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg', // If you have this file
        color: '#5bbad5' // Optional brand color
      }
    ]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}