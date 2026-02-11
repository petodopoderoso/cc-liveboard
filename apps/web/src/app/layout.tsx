import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloudflare Colombia Live Board",
  description:
    "Tablero interactivo en tiempo real. Haz preguntas y vota por las mejores.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-cf-darker text-cf-light min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
