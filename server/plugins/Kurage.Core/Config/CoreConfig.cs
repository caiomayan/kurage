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
    public string ServerApiKey { get; set; } = "kurage-secret-server-key";

    [JsonPropertyName("DefaultGameMode")]
    public string DefaultGameMode { get; set; } = "COMPETITIVE_5V5";

    [JsonPropertyName("HeartbeatIntervalSeconds")]
    public int HeartbeatIntervalSeconds { get; set; } = 30;

    [JsonPropertyName("EnableWelcomeChatMessages")]
    public bool EnableWelcomeChatMessages { get; set; } = true;

    [JsonPropertyName("ChatPrefix")]
    public string ChatPrefix { get; set; } = "[{Aqua}KURAGE{Default}]";

    [JsonPropertyName("WebsiteUrl")]
    public string WebsiteUrl { get; set; } = "https://kurage.caiomayan.com";
}
