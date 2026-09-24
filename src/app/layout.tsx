import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AI Governance · Community workspace",
  description: "A human-led AI governance demonstration for nonprofits.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
