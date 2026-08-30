import "server-only";

import { notFound } from "next/navigation";
import { API_BASE_URL } from "@/lib/constants";
import type { UserWithStats } from "@/types/user";

function isPublicPlayer(value: unknown): value is UserWithStats {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<UserWithStats>;
  return Boolean(candidate.kurageId && candidate.steamId64 && candidate.username);
}

export async function loadPublicPlayer(kurageId: string): Promise<UserWithStats> {
  if (!/^\d+$/.test(kurageId)) notFound();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/users/${kurageId}`, {
      next: { revalidate: 60 },
    });
  } catch (cause) {
    throw new Error("A API de perfis está temporariamente indisponível.", { cause });
  }

  if (response.status === 404) notFound();
  if (!response.ok) {
    throw new Error(`A API de perfis respondeu com status ${response.status}.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new Error("A API de perfis retornou uma resposta inválida.", { cause });
  }

  if (!isPublicPlayer(payload)) {
    throw new Error("A API de perfis retornou um contrato incompatível.");
  }
  return payload;
}
