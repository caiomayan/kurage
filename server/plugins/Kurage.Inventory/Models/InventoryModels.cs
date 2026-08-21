using System.Text.Json.Serialization;

namespace Kurage.Inventory.Models;

public class RawInventoryResponse
{
    [JsonPropertyName("items")]
    public Dictionary<string, RawInventoryItem>? Items { get; set; }

    [JsonPropertyName("version")]
    public int Version { get; set; } = 2;
}

public class RawInventoryItem
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("uid")]
    public int? Uid { get; set; }

    [JsonPropertyName("wear")]
    public float? Wear { get; set; }

    [JsonPropertyName("seed")]
    public int? Seed { get; set; }

    [JsonPropertyName("statTrak")]
    public int? StatTrak { get; set; }

    [JsonPropertyName("nameTag")]
    public string? NameTag { get; set; }

    [JsonPropertyName("equipped")]
    public bool? Equipped { get; set; }

    [JsonPropertyName("equippedCT")]
    public bool? EquippedCT { get; set; }

    [JsonPropertyName("equippedT")]
    public bool? EquippedT { get; set; }

    [JsonPropertyName("stickers")]
    public Dictionary<string, RawStickerItem>? Stickers { get; set; }

    [JsonPropertyName("keychains")]
    public Dictionary<string, RawKeychainItem>? Keychains { get; set; }
}

public class RawStickerItem
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("wear")]
    public float? Wear { get; set; }
}

public class RawKeychainItem
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("seed")]
    public int? Seed { get; set; }
}
