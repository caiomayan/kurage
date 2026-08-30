using System.Text.Json.Serialization;
using CounterStrikeSharp.API.Core;

namespace Kurage.Core.Config;

public class KurageCoreConfig : BasePluginConfig
{
    [JsonPropertyName("ApiUrl")]
    public string ApiUrl { get; set; } = "http://127.0.0.1:8080";

    [JsonPropertyName("ServerId")]
    public string ServerId { get; set; } = "b1a2c3d4-0000-0000-0000-000000000001";

    [JsonPropertyName("ServerApiKey")]
    public string ServerApiKey { get; set; } = string.Empty;

    [JsonPropertyName("GameMode")]
    public string GameMode { get; set; } = "RETAKE";

    [JsonPropertyName("ServerKind")]
    public string ServerKind { get; set; } = "FIXED";

    [JsonPropertyName("ServerDisplayName")]
    public string ServerDisplayName { get; set; } = "Kurage Retake #1";

    [JsonPropertyName("HeartbeatIntervalSeconds")]
    public int HeartbeatIntervalSeconds { get; set; } = 30;

    [JsonPropertyName("EnableWelcomeChatMessages")]
    public bool EnableWelcomeChatMessages { get; set; } = true;

    [JsonPropertyName("ExtensionSettings")]
    public Dictionary<string, string> ExtensionSettings { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}
