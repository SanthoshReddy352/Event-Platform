// app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext"; // IMPORT THE PROVIDER

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "EventX - College Event Platform", // <-- CHANGED
  description: "Join us for amazing hackathons and technical events from all clubs", // <-- CHANGED
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark"> {/* <-- ADDED "dark" CLASS */}
      <body className={inter.className}>
        <AuthProvider> {/* WRAP WITH PROVIDER */}
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}