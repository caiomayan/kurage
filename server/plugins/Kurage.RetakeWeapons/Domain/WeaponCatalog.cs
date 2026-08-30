namespace Kurage.RetakeWeapons.Domain;

internal static class WeaponCatalog
{
    public const string Awp = "weapon_awp";

    public static readonly HashSet<string> Pistols = new(StringComparer.OrdinalIgnoreCase)
    {
        "weapon_cz75a", "weapon_deagle", "weapon_elite", "weapon_fiveseven",
        "weapon_glock", "weapon_hkp2000", "weapon_p250", "weapon_revolver",
        "weapon_tec9", "weapon_usp_silencer"
    };

    public static readonly HashSet<string> Rifles = new(StringComparer.OrdinalIgnoreCase)
    {
        "weapon_ak47", "weapon_aug", "weapon_famas", "weapon_galilar",
        "weapon_m4a1", "weapon_m4a1_silencer", "weapon_sg556"
    };

    private static readonly HashSet<string> PrimaryWeapons = new(Rifles, StringComparer.OrdinalIgnoreCase)
    {
        Awp,
        "weapon_bizon", "weapon_mac10", "weapon_mp5sd", "weapon_mp7", "weapon_mp9", "weapon_p90", "weapon_ump45",
        "weapon_mag7", "weapon_nova", "weapon_sawedoff", "weapon_xm1014",
        "weapon_m249", "weapon_negev",
        "weapon_g3sg1", "weapon_scar20", "weapon_ssg08"
    };

    private static readonly Dictionary<string, int> Prices = new(StringComparer.OrdinalIgnoreCase)
    {
        ["weapon_ak47"] = 2700,
        ["weapon_aug"] = 3300,
        ["weapon_famas"] = 1950,
        ["weapon_galilar"] = 1800,
        ["weapon_m4a1"] = 3100,
        ["weapon_m4a1_silencer"] = 2900,
        ["weapon_sg556"] = 3000,
        [Awp] = 4750,
        ["weapon_g3sg1"] = 5000,
        ["weapon_scar20"] = 5000,
        ["weapon_ssg08"] = 1700
    };

    public static string Normalize(string weapon)
    {
        var normalized = (weapon ?? string.Empty).Trim().ToLowerInvariant();
        return normalized.StartsWith("weapon_", StringComparison.Ordinal)
            ? normalized
            : $"weapon_{normalized}";
    }

    public static bool IsPistol(string weapon) => Pistols.Contains(Normalize(weapon));
    public static bool IsRifle(string weapon) => Rifles.Contains(Normalize(weapon));
    public static bool IsPrimary(string weapon) => PrimaryWeapons.Contains(Normalize(weapon));
    public static bool IsAllowedPurchase(string weapon) => IsPistol(weapon) || IsRifle(weapon) || Normalize(weapon) == Awp;
    public static int PriceOf(string weapon) => Prices.GetValueOrDefault(Normalize(weapon));
}
