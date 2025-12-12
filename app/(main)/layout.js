// app/(main)/layout.js

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// This layout wraps all pages that SHOULD have the Navbar and Footer
export default function MainAppLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}