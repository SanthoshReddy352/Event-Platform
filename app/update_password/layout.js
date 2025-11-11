// app/update_password/layout.js

// This layout is intentionally minimal.
// It will be wrapped by the root layout (app/layout.js)
// but NOT by the (main)/layout.js.
// This prevents the Navbar from appearing and fixes the hydration error.
export default function UpdatePasswordLayout({ children }) {
  return (
    <main className="min-h-screen">
      {children}
    </main>
  );
}