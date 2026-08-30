import React from "react";
import type { Metadata } from "next";
import { PlayerProfileClient } from "@/components/profile/PlayerProfileClient";
import { API_BASE_URL } from "@/lib/constants";
import { loadPublicPlayer } from "@/lib/public-player-profile";

interface PageProps {
  params: Promise<{
    kurageId: string;
    slug?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kurageId, slug } = await params;
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

  const fallbackName = slug ? decodeURIComponent(slug) : `Jogador #${kurageId}`;
  return {
    title: fallbackName,
    description: `Perfil oficial e telemetria de combate no ecossistema competitivo Kurage.`,
  };
}

export default async function PlayerProfileSlugPage({ params }: PageProps) {
  const { kurageId } = await params;

  const user = await loadPublicPlayer(kurageId);
  return <PlayerProfileClient user={user} isOwner={false} />;
}
