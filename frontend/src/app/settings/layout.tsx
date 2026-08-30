import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configurações",
  description: "Gerencie seu perfil, preferências, contatos e integrações da Kurage.",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
