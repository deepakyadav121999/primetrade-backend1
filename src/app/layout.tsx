import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primetrade – Task Manager",
  description:
    "Scalable REST API with JWT authentication and role-based access control. Primetrade.ai Internship Assignment.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
