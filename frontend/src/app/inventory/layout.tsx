import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventário",
  description: "Gerencie skins, acessórios e configurações do seu inventário CS2 na Kurage.",
};

export default function InventoryLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
