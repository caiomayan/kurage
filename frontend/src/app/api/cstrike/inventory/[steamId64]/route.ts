import { NextResponse } from "next/server";

interface SteamAsset {
  assetid: string;
  classid: string;
  instanceid?: string;
}

interface SteamTag {
  category?: string;
  category_name?: string;
  localized_tag_name?: string;
  name?: string;
  color?: string;
}

interface SteamDescription {
  classid: string;
  instanceid?: string;
  market_hash_name?: string;
  name?: string;
  icon_url?: string;
  tags?: SteamTag[];
}

interface SteamInventoryResponse {
  assets?: SteamAsset[];
  descriptions?: SteamDescription[];
}

function asSteamInventoryResponse(value: unknown): SteamInventoryResponse | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { assets?: unknown; descriptions?: unknown };
  if (!Array.isArray(candidate.assets) || !Array.isArray(candidate.descriptions)) return null;
  return candidate as SteamInventoryResponse;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ steamId64: string }> }
) {
  const resolvedParams = await params;
  const steamId64 = resolvedParams.steamId64;

  if (!steamId64 || !/^\d{17}$/.test(steamId64)) {
    return NextResponse.json({ error: "Invalid Steam ID" }, { status: 400 });
  }

  // 1. Try cstrike.app first
  try {
    const cstrikeUrl = `https://inventory.cstrike.app/${steamId64}`;
    const response = await fetch(cstrikeUrl, {
      next: {
        revalidate: 600, // 10 minutes cache
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    const contentType = response.headers.get("content-type") || "";
    if (response.ok && contentType.includes("application/json")) {
      const rawText = await response.text();
      if (!rawText.trim().startsWith("<")) {
        const data: unknown = JSON.parse(rawText);
        if (Array.isArray(data) || (data && typeof data === "object")) {
          return NextResponse.json(data);
        }
      }
    }
  } catch (err) {
    console.warn("cstrike.app fetch failed, falling back to Steam Community:", err);
  }

  // 2. Fallback: Query Steam Community Inventory API directly
  try {
    const steamUrl = `https://steamcommunity.com/inventory/${steamId64}/730/2?l=portuguese&count=500`;
    const steamRes = await fetch(steamUrl, {
      next: {
        revalidate: 600,
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    const steamContentType = steamRes.headers.get("content-type") || "";
    if (steamRes.ok && steamContentType.includes("application/json")) {
      const steamText = await steamRes.text();
      if (!steamText.trim().startsWith("<")) {
        const steamData = asSteamInventoryResponse(JSON.parse(steamText));
        if (steamData?.assets && steamData.descriptions) {
          const descMap = new Map<string, SteamDescription>();
          for (const desc of steamData.descriptions) {
            const key = `${desc.classid}_${desc.instanceid || "0"}`;
            descMap.set(key, desc);
          }

          const items = steamData.assets.map((asset) => {
            const key = `${asset.classid}_${asset.instanceid || "0"}`;
            const desc = descMap.get(key);
            const rarityTag = (desc?.tags ?? []).find(
              (tag) => tag.category === "Rarity" || tag.category_name === "Raridade"
            );
            const isStatTrak = (desc?.market_hash_name || desc?.name || "").includes("StatTrak™");

            return {
              id: asset.assetid,
              name: desc?.market_hash_name || desc?.name || "Item CS2",
              icon_url: desc?.icon_url,
              rarity: rarityTag
                ? {
                    name: rarityTag.localized_tag_name || rarityTag.name,
                    color: rarityTag.color ? `#${rarityTag.color}` : "#d32ce6",
                  }
                : undefined,
              stattrak: isStatTrak,
            };
          });

          return NextResponse.json(items);
        }
      }
    }

    if (steamRes.status === 403 || steamRes.status === 404) {
      return NextResponse.json(
        { error: "private_or_not_found", items: [] },
        { status: 200 }
      );
    }
  } catch (steamErr) {
    console.warn("Steam community inventory fetch error:", steamErr);
  }

  return NextResponse.json(
    { error: "inventory_upstream_unavailable" },
    { status: 503 },
  );
}
