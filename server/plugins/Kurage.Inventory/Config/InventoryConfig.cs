using System.Text.Json.Serialization;
using CounterStrikeSharp.API.Core;

namespace Kurage.Inventory.Config;

public class InventoryConfig : BasePluginConfig
{
    [JsonPropertyName("ApiUrl")]
    public string ApiUrl { get; set; } = "http://127.0.0.1:8080";

    [JsonPropertyName("SyncOnSpawn")]
    public bool SyncOnSpawn { get; set; } = true;

    [JsonPropertyName("SyncOnRoundStart")]
    public bool SyncOnRoundStart { get; set; } = false;

    [JsonPropertyName("ChatPrefix")]
    public string ChatPrefix { get; set; } = "[{Aqua}KURAGE·SKINS{Default}]";
}
