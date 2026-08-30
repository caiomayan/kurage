import React from "react";
import type { Metadata } from "next";
import { PlayerProfileClient } from "@/components/profile/PlayerProfileClient";
import { API_BASE_URL } from "@/lib/constants";
import { loadPublicPlayer } from "@/lib/public-player-profile";

interface PageProps {
  params: Promise<{
    kurageId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kurageId } = await params;
  try {
    const res = await fetch(`${API_BASE_URL}/users/${kurageId}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const user = await res.json();
      if (user?.username) {
        return {
          title: user.username,
          description: `Perfil oficial e telemetria de combate de ${user.username} no ecossistema competitivo Kurage.`,
        };
      }
    }
  } catch {
    // continue
  }

  return {
    title: `Jogador #${kurageId}`,
    description: `Perfil oficial e telemetria de combate no ecossistema competitivo Kurage.`,
  };
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { kurageId } = await params;

  const user = await loadPublicPlayer(kurageId);
  return <PlayerProfileClient user={user} isOwner={false} />;
}
