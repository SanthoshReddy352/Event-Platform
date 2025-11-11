// app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext"; // IMPORT THE PROVIDER

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "EventX - College Event Platform",
  description: "Join us for amazing hackathons and technical events from all clubs",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <AuthProvider>
          {/* Navbar and Footer are REMOVED from here.
            They will be rendered by the app/(main)/layout.js file.
            Auth pages like login/password reset will NOT use that layout,
            which solves the security and hydration bugs.
          */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}