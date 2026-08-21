import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerProfileClient } from "@/components/profile/PlayerProfileClient";
import type { UserWithStats } from "@/types/user";

interface PageProps {
  params: Promise<{
    kurageId: string;
    slug?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kurageId, slug } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  try {
    const res = await fetch(`${apiUrl}/users/${kurageId}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const user = await res.json();
      if (user?.username) {
        return {
          title: `Kurage · ${user.username}`,
          description: `Perfil oficial e telemetria de combate de ${user.username} no ecossistema competitivo Kurage.`,
        };
      }
    }
  } catch {
    // continue
  }

  const fallbackName = slug ? decodeURIComponent(slug) : `Jogador #${kurageId}`;
  return {
    title: `Kurage · ${fallbackName}`,
    description: `Perfil oficial e telemetria de combate no ecossistema competitivo Kurage.`,
  };
}

export default async function PlayerProfileSlugPage({ params }: PageProps) {
  const { kurageId } = await params;

  if (!kurageId) {
    notFound();
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
  let user: UserWithStats | null = null;

  try {
    const res = await fetch(`${apiUrl}/users/${kurageId}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      user = await res.json();
    } else if (res.status === 404) {
      notFound();
    }
  } catch {
    notFound();
  }

  if (!user) {
    notFound();
  }

  return <PlayerProfileClient user={user} isOwner={false} />;
}
