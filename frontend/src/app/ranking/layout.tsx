import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Os melhores",
  description: "Ranking global e tabela de líderes competitivos da Kurage.",
};

export default function RankingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
