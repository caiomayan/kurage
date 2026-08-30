import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrando com a Steam",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
