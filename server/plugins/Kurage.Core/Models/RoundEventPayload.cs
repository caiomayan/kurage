using System.Text.Json.Serialization;

namespace Kurage.Core.Models;

/// <summary>
/// Um round concluído, no formato que a API espera em
/// <c>POST /plugin/v1/servers/{id}/rounds</c>.
///
/// Sem este evento nada do modelo competitivo recebe entrada: o heartbeat não
/// carrega participação por round, então a calibração nunca avançaria.
/// </summary>
public class RoundEventPayload
{
    /// <summary>Bloco contínuo do processo do servidor.</summary>
    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    /// <summary>Monotônico dentro da sessão; detecta buraco e reordenação.</summary>
    [JsonPropertyName("sequence")]
    public long Sequence { get; set; }

    /// <summary>
    /// Única por round. É o que torna o reenvio seguro: um round reenviado
    /// depois de uma falha de rede não pode contar duas vezes.
    /// </summary>
    [JsonPropertyName("idempotencyKey")]
    public string IdempotencyKey { get; set; } = string.Empty;

    [JsonPropertyName("map")]
    public string? Map { get; set; }

    [JsonPropertyName("endedAt")]
    public DateTimeOffset EndedAt { get; set; }

    [JsonPropertyName("gameMode")]
    public string GameMode { get; set; } = "RETAKE";

    [JsonPropertyName("winningSide")]
    public string? WinningSide { get; set; }

    [JsonPropertyName("players")]
    public List<RoundPlayerPayload> Players { get; set; } = new();
}

/// <summary>O que um jogador fez em um round.</summary>
public class RoundPlayerPayload
{
    [JsonPropertyName("steamId64")]
    public string SteamId64 { get; set; } = string.Empty;

    [JsonPropertyName("side")]
    public string Side { get; set; } = "CT";

    [JsonPropertyName("kills")]
    public int Kills { get; set; }

    [JsonPropertyName("deaths")]
    public int Deaths { get; set; }

    [JsonPropertyName("assists")]
    public int Assists { get; set; }

    [JsonPropertyName("damage")]
    public int Damage { get; set; }

    [JsonPropertyName("survived")]
    public bool Survived { get; set; }

    /// <summary>Morreu, mas a morte foi vingada. Entra no KAST.</summary>
    [JsonPropertyName("wasTraded")]
    public bool WasTraded { get; set; }

    [JsonPropertyName("openingKill")]
    public bool OpeningKill { get; set; }

    [JsonPropertyName("openingDeath")]
    public bool OpeningDeath { get; set; }
}
