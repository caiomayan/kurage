using System.Text.Json.Serialization;

namespace Kurage.Core.Models;

public class ServerHeartbeatPayload
{
    [JsonPropertyName("currentMap")]
    public string CurrentMap { get; set; } = string.Empty;

    [JsonPropertyName("currentPlayers")]
    public int CurrentPlayers { get; set; }

    [JsonPropertyName("maxPlayers")]
    public int MaxPlayers { get; set; }

    [JsonPropertyName("gameMode")]
    public string? GameMode { get; set; }

    [JsonPropertyName("players")]
    public List<ServerPlayerPayload>? Players { get; set; }
}

public class ServerPlayerPayload
{
    [JsonPropertyName("steamId64")]
    public string SteamId64 { get; set; } = string.Empty;

    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [JsonPropertyName("team")]
    public string Team { get; set; } = "SPEC";

    [JsonPropertyName("kills")]
    public int Kills { get; set; }

    [JsonPropertyName("deaths")]
    public int Deaths { get; set; }

    [JsonPropertyName("ping")]
    public int Ping { get; set; }

    [JsonPropertyName("isAlive")]
    public bool IsAlive { get; set; }
}

public class PlayerProfileSummary
{
    [JsonPropertyName("kurageId")]
    public long KurageId { get; set; }

    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [JsonPropertyName("steamId64")]
    public string SteamId64 { get; set; } = string.Empty;

    [JsonPropertyName("clanTag")]
    public string? ClanTag { get; set; }

    [JsonPropertyName("rankPosition")]
    public int? RankPosition { get; set; }

    [JsonPropertyName("isVerifiedPro")]
    public bool IsVerifiedPro { get; set; }

    [JsonPropertyName("subscriptionTier")]
    public string SubscriptionTier { get; set; } = "FREE";

    [JsonPropertyName("stats")]
    public PlayerStatsData? Stats { get; set; }

    public int KurageElo => Stats?.KurageElo ?? 2000;
}

public class PlayerStatsData
{
    [JsonPropertyName("kurageElo")]
    public int KurageElo { get; set; } = 2000;

    [JsonPropertyName("kills")]
    public int Kills { get; set; }

    [JsonPropertyName("deaths")]
    public int Deaths { get; set; }

    [JsonPropertyName("matchesPlayed")]
    public int MatchesPlayed { get; set; }
}
