import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "O mar",
  description: "Servidor oficial da Kurage com telemetria abissal e estatísticas ao vivo.",
};

export default function MarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
