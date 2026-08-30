using System.Text.Json.Serialization;
using CounterStrikeSharp.API.Core;

namespace Kurage.RetakeWeapons.Config;

public sealed class RetakeWeaponsConfig : BasePluginConfig
{
    [JsonPropertyName("Enabled")]
    public bool Enabled { get; set; } = true;

    [JsonPropertyName("BuyWindowSeconds")]
    public int BuyWindowSeconds { get; set; } = 5;

    [JsonPropertyName("RoundLoadoutDelaySeconds")]
    public float RoundLoadoutDelaySeconds { get; set; } = 0.35f;

    [JsonPropertyName("PersistPistolPreference")]
    public bool PersistPistolPreference { get; set; } = true;

    [JsonPropertyName("EnforceNativeBuyRules")]
    public bool EnforceNativeBuyRules { get; set; } = true;

    [JsonPropertyName("DamageWeight")]
    public int DamageWeight { get; set; } = 1;

    [JsonPropertyName("KillWeight")]
    public int KillWeight { get; set; } = 50;

    [JsonPropertyName("AssistWeight")]
    public int AssistWeight { get; set; } = 25;

    [JsonPropertyName("ObjectiveWeight")]
    public int ObjectiveWeight { get; set; } = 50;

    [JsonPropertyName("FriendlyDamagePenalty")]
    public int FriendlyDamagePenalty { get; set; } = 1;
}
