using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes.Registration;
using CounterStrikeSharp.API.Core.Capabilities;
using CounterStrikeSharp.API.Modules.Commands;
using CounterStrikeSharp.API.Modules.Timers;
using CounterStrikeSharp.API.Modules.Utils;
using Kurage.Core.Contracts;
using Kurage.RetakeWeapons.Config;
using Kurage.RetakeWeapons.Domain;
using Microsoft.Extensions.Logging;
using System.Diagnostics.CodeAnalysis;

namespace Kurage.RetakeWeapons;

public sealed class KurageRetakeWeaponsPlugin : BasePlugin, IPluginConfig<RetakeWeaponsConfig>
{
    private const int TerroristTeam = (int)CsTeam.Terrorist;
    private const int CounterTerroristTeam = (int)CsTeam.CounterTerrorist;
    private const int MaximumMoney = 16000;

    private static readonly PluginCapability<IKurageCoreContext> CoreCapability = new(KurageCoreCapability.Name);

    private readonly AwpQueue _awpQueue = new();
    private readonly RoundPerformanceTracker _performance = new();
    private readonly Dictionary<int, ulong> _roundAwpOwners = new();
    private readonly Dictionary<ulong, string> _pistolPreferences = new();
    private IKurageCoreContext? _core;
    private CounterStrikeSharp.API.Modules.Timers.Timer? _roundLoadoutTimer;
    private bool _roundLoadoutReady;

    public override string ModuleName => "Kurage.RetakeWeapons";
    public override string ModuleVersion => "1.0.0";
    public override string ModuleAuthor => "Kurage Team";
    public override string ModuleDescription => "Compras nativas, preferência de pistola e fila competitiva de AWP para Retake.";

    public RetakeWeaponsConfig Config { get; set; } = new();

    public void OnConfigParsed(RetakeWeaponsConfig config)
    {
        if (config.BuyWindowSeconds is < 1 or > 30)
        {
            throw new InvalidOperationException("Kurage.RetakeWeapons BuyWindowSeconds must be between 1 and 30.");
        }

        if (config.RoundLoadoutDelaySeconds is < 0.1f or > 3f)
        {
            throw new InvalidOperationException("Kurage.RetakeWeapons RoundLoadoutDelaySeconds must be between 0.1 and 3 seconds.");
        }

        if (config.DamageWeight < 0 || config.KillWeight < 0 || config.AssistWeight < 0 ||
            config.ObjectiveWeight < 0 || config.FriendlyDamagePenalty < 0)
        {
            throw new InvalidOperationException("Kurage.RetakeWeapons performance weights cannot be negative.");
        }

        Config = config;
    }

    public override void Load(bool hotReload)
    {
        if (!Config.Enabled)
        {
            Logger.LogWarning("[Kurage.RetakeWeapons] Plugin disabled by configuration.");
            return;
        }

        _core = CoreCapability.Get()
            ?? throw new InvalidOperationException(
                "Kurage.RetakeWeapons requires Kurage.Core 2.4.0 or newer and Kurage.Core.Contracts in CounterStrikeSharp/shared.");

        if (_core.ContractVersion != KurageCoreCapability.ContractVersion)
        {
            throw new InvalidOperationException(
                $"Unsupported Kurage.Core contract version {_core.ContractVersion}; expected {KurageCoreCapability.ContractVersion}.");
        }

        if (!string.Equals(_core.GameMode, "RETAKE", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Kurage.RetakeWeapons can only run on RETAKE servers; Kurage.Core reports {_core.GameMode}.");
        }

        RegisterListener<Listeners.OnMapStart>(OnMapStart);
        RegisterListener<Listeners.OnMapEnd>(OnMapEnd);
        AddCommandListener("drop", OnDropCommand, HookMode.Pre);

        ApplyNativeBuyRules();
        Logger.LogInformation(
            "[Kurage.RetakeWeapons] Active on {ServerDisplayName}; inherited prefix: {ChatPrefix}",
            _core.ServerDisplayName,
            _core.ChatPrefix);

        if (hotReload)
        {
            ResetMapState();
        }
    }

    public override void Unload(bool hotReload)
    {
        _roundLoadoutTimer?.Kill();
        _roundLoadoutTimer = null;
        RemoveCommandListener("drop", OnDropCommand, HookMode.Pre);
        ResetMapState();
        _pistolPreferences.Clear();
    }

    private void OnMapStart(string mapName)
    {
        ResetMapState();
        ApplyNativeBuyRules();
    }

    private void OnMapEnd()
    {
        _roundLoadoutTimer?.Kill();
        _roundLoadoutTimer = null;
        ResetMapState();
    }

    [GameEventHandler]
    public HookResult OnRoundPostStart(EventRoundPoststart @event, GameEventInfo info)
    {
        if (!IsActive())
        {
            return HookResult.Continue;
        }

        ApplyNativeBuyRules();
        _roundAwpOwners.Clear();
        _performance.BeginRound();
        _roundLoadoutReady = false;

        _roundLoadoutTimer?.Kill();
        _roundLoadoutTimer = AddTimer(
            Config.RoundLoadoutDelaySeconds,
            ApplyRoundLoadouts,
            TimerFlags.STOP_ON_MAPCHANGE);

        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnRoundEnd(EventRoundEnd @event, GameEventInfo info)
    {
        if (!IsActive())
        {
            return HookResult.Continue;
        }

        _performance.CompleteRound(
            Config.DamageWeight,
            Config.KillWeight,
            Config.AssistWeight,
            Config.ObjectiveWeight,
            Config.FriendlyDamagePenalty);
        _roundLoadoutReady = false;

        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnItemPurchase(EventItemPurchase @event, GameEventInfo info)
    {
        if (!IsActive())
        {
            return HookResult.Continue;
        }

        var player = @event.Userid;
        if (!IsHumanPlayer(player) || !IsPlayingTeam(player.TeamNum))
        {
            return HookResult.Continue;
        }

        var weapon = WeaponCatalog.Normalize(@event.Weapon);
        if (WeaponCatalog.IsPrimary(weapon) && !_roundLoadoutReady)
        {
            BlockPurchase(player, weapon, "Aguarde a preparação do loadout e tente novamente.");
            return HookResult.Continue;
        }

        if (WeaponCatalog.IsPistol(weapon))
        {
            if (Config.PersistPistolPreference)
            {
                _pistolPreferences[player.SteamID] = weapon;
            }

            return HookResult.Continue;
        }

        if (WeaponCatalog.IsRifle(weapon))
        {
            if (_awpQueue.Remove(player.SteamID))
            {
                Print(player, "Você saiu da fila da AWP ao escolher outro rifle.");
            }

            return HookResult.Continue;
        }

        if (weapon == WeaponCatalog.Awp)
        {
            HandleAwpPurchase(player);
            return HookResult.Continue;
        }

        if (!WeaponCatalog.IsAllowedPurchase(weapon))
        {
            BlockPurchase(player, weapon, "Neste Retake, somente pistolas, rifles e uma AWP por time estão liberados.");
        }

        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnPlayerHurt(EventPlayerHurt @event, GameEventInfo info)
    {
        if (!IsActive())
        {
            return HookResult.Continue;
        }

        var attacker = @event.Attacker;
        var victim = @event.Userid;
        if (!IsHumanPlayer(attacker) || !IsHumanPlayer(victim) || attacker.SteamID == victim.SteamID)
        {
            return HookResult.Continue;
        }

        if (attacker.TeamNum == victim.TeamNum)
        {
            _performance.AddFriendlyDamage(attacker.SteamID, @event.DmgHealth);
        }
        else
        {
            _performance.AddEnemyDamage(attacker.SteamID, @event.DmgHealth);
        }

        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnPlayerDeath(EventPlayerDeath @event, GameEventInfo info)
    {
        if (!IsActive())
        {
            return HookResult.Continue;
        }

        var victim = @event.Userid;
        var attacker = @event.Attacker;
        if (IsHumanPlayer(victim) && IsHumanPlayer(attacker) &&
            attacker.SteamID != victim.SteamID && attacker.TeamNum != victim.TeamNum)
        {
            _performance.AddKill(attacker.SteamID);
        }

        var assister = @event.Assister;
        if (IsHumanPlayer(victim) && IsHumanPlayer(assister) && assister.TeamNum != victim.TeamNum)
        {
            _performance.AddAssist(assister.SteamID);
        }

        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnBombPlanted(EventBombPlanted @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (IsActive() && IsHumanPlayer(player))
        {
            _performance.AddObjective(player.SteamID);
        }

        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnBombDefused(EventBombDefused @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (IsActive() && IsHumanPlayer(player))
        {
            _performance.AddObjective(player.SteamID);
        }

        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnPlayerTeam(EventPlayerTeam @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (IsHumanPlayer(player) && (@event.Disconnect || @event.Oldteam != @event.Team))
        {
            _awpQueue.Remove(player.SteamID);
        }

        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnPlayerDisconnect(EventPlayerDisconnect @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (player is not null)
        {
            _awpQueue.Remove(player.SteamID);
        }

        return HookResult.Continue;
    }

    private void HandleAwpPurchase(CCSPlayerController player)
    {
        var team = player.TeamNum;
        var steamId = player.SteamID;

        if (_roundAwpOwners.TryGetValue(team, out var owner))
        {
            if (owner == steamId)
            {
                Print(player, "Sua vaga de AWP já está bloqueada para este round.");
                return;
            }

            QueueAndBlockAwp(player, team);
            return;
        }

        var existingOwner = FindAwpOwner(team, steamId);
        if (existingOwner.HasValue)
        {
            _roundAwpOwners[team] = existingOwner.Value;
            QueueAndBlockAwp(player, team);
            return;
        }

        _roundAwpOwners[team] = steamId;
        _awpQueue.Remove(steamId);
        Print(player, "AWP confirmada para você neste round.");
    }

    private HookResult OnDropCommand(CCSPlayerController? player, CommandInfo command)
    {
        if (!IsActive() || !IsHumanPlayer(player))
        {
            return HookResult.Continue;
        }

        var activeWeapon = player.PlayerPawn.Value?.WeaponServices?.ActiveWeapon.Value;
        if (activeWeapon is null || !activeWeapon.IsValid ||
            WeaponCatalog.Normalize(activeWeapon.DesignerName) != WeaponCatalog.Awp)
        {
            return HookResult.Continue;
        }

        Print(player, "A AWP não pode ser descartada durante o round.");
        return HookResult.Stop;
    }

    private void QueueAndBlockAwp(CCSPlayerController player, int team)
    {
        var position = _awpQueue.Enqueue(player.SteamID, team);
        BlockPurchase(
            player,
            WeaponCatalog.Awp,
            $"A AWP deste time já está reservada. Você entrou na fila (posição {position}).");
    }

    private void ApplyRoundLoadouts()
    {
        _roundLoadoutTimer = null;

        foreach (var player in HumanPlayers().Where(player => player.PawnIsAlive))
        {
            if (Config.PersistPistolPreference && _pistolPreferences.TryGetValue(player.SteamID, out var pistol))
            {
                RemoveWeapons(player, WeaponCatalog.IsPistol);
                player.GiveNamedItem(pistol);
            }
        }

        AwardQueuedAwp(TerroristTeam);
        AwardQueuedAwp(CounterTerroristTeam);
        _roundLoadoutReady = true;
    }

    private void AwardQueuedAwp(int team)
    {
        var winnerSteamId = _awpQueue.TakeWinner(
            team,
            _performance.LastRound,
            steamId => FindPlayer(steamId) is { } player && player.PawnIsAlive && player.TeamNum == team);

        if (!winnerSteamId.HasValue)
        {
            var existingOwner = FindAwpOwner(team);
            if (existingOwner.HasValue)
            {
                _roundAwpOwners[team] = existingOwner.Value;
            }

            return;
        }

        var winner = FindPlayer(winnerSteamId.Value);
        if (winner is null)
        {
            return;
        }

        foreach (var teammate in HumanPlayers().Where(player => player.TeamNum == team))
        {
            RemoveWeapons(teammate, weapon => weapon == WeaponCatalog.Awp);
        }

        RemoveWeapons(winner, WeaponCatalog.IsPrimary);
        winner.GiveNamedItem(WeaponCatalog.Awp);
        _roundAwpOwners[team] = winner.SteamID;

        PrintTeam(team, $"{winner.PlayerName} recebeu a AWP pela melhor atuação do último round entre os jogadores da fila.");
    }

    private ulong? FindAwpOwner(int team, ulong excludedSteamId = 0)
    {
        return HumanPlayers()
            .Where(player => player.TeamNum == team && player.SteamID != excludedSteamId)
            .Where(player => HasWeapon(player, WeaponCatalog.Awp))
            .Select(player => (ulong?)player.SteamID)
            .FirstOrDefault();
    }

    private void BlockPurchase(CCSPlayerController player, string weapon, string message)
    {
        var normalized = WeaponCatalog.Normalize(weapon);
        var refund = WeaponCatalog.PriceOf(normalized);
        if (refund > 0 && player.InGameMoneyServices is { } money)
        {
            money.Account = Math.Min(MaximumMoney, money.Account + refund);
            Utilities.SetStateChanged(player, "CCSPlayerController", "m_pInGameMoneyServices");
        }

        Server.NextFrame(() =>
        {
            if (IsHumanPlayer(player))
            {
                RemoveWeapons(player, current => current == normalized);
            }
        });

        Print(player, message);
    }

    private void ApplyNativeBuyRules()
    {
        if (!IsActive() || !Config.EnforceNativeBuyRules)
        {
            return;
        }

        // 1 pistols + 4 rifles + 16 snipers. The plugin rejects Scout and auto-snipers.
        Server.ExecuteCommand("mp_buy_anywhere 1");
        Server.ExecuteCommand($"mp_buytime {Config.BuyWindowSeconds}");
        Server.ExecuteCommand("mp_buy_allow_guns 21");
        Server.ExecuteCommand("mp_buy_allow_grenades 0");
        Server.ExecuteCommand("mp_weapons_allow_zeus 0");
        Server.ExecuteCommand("mp_free_armor 2");
        Server.ExecuteCommand("mp_max_armor 2");
        Server.ExecuteCommand("mp_defuser_allocation 2");
        Server.ExecuteCommand($"mp_maxmoney {MaximumMoney}");
        Server.ExecuteCommand($"mp_startmoney {MaximumMoney}");
        Server.ExecuteCommand($"mp_afterroundmoney {MaximumMoney}");
    }

    private void ResetMapState()
    {
        _awpQueue.Clear();
        _performance.Clear();
        _roundAwpOwners.Clear();
        _roundLoadoutReady = false;
    }

    private bool IsActive() => Config.Enabled && _core is not null;

    private void Print(CCSPlayerController player, string message)
    {
        if (IsHumanPlayer(player) && _core is not null)
        {
            player.PrintToChat($"{_core.FormatChatPrefix()} {message}");
        }
    }

    private void PrintTeam(int team, string message)
    {
        foreach (var player in HumanPlayers().Where(player => player.TeamNum == team))
        {
            Print(player, message);
        }
    }

    private static IEnumerable<CCSPlayerController> HumanPlayers() =>
        Utilities.GetPlayers().Where(IsHumanPlayer);

    private static CCSPlayerController? FindPlayer(ulong steamId) =>
        HumanPlayers().FirstOrDefault(player => player.SteamID == steamId);

    private static bool IsHumanPlayer([NotNullWhen(true)] CCSPlayerController? player) =>
        player is not null && player.IsValid && !player.IsBot && !player.IsHLTV;

    private static bool IsPlayingTeam(int team) =>
        team is TerroristTeam or CounterTerroristTeam;

    private static bool HasWeapon(CCSPlayerController player, string weapon) =>
        GetWeapons(player).Any(current => string.Equals(current.DesignerName, weapon, StringComparison.OrdinalIgnoreCase));

    private static void RemoveWeapons(CCSPlayerController player, Func<string, bool> shouldRemove)
    {
        var pawn = player.PlayerPawn.Value;
        if (pawn is null || !pawn.IsValid)
        {
            return;
        }

        foreach (var weapon in GetWeapons(player).Where(current => shouldRemove(WeaponCatalog.Normalize(current.DesignerName))).ToList())
        {
            pawn.RemovePlayerItem(weapon);
            weapon.Remove();
        }
    }

    private static IEnumerable<CBasePlayerWeapon> GetWeapons(CCSPlayerController player)
    {
        var pawn = player.PlayerPawn.Value;
        var services = pawn?.WeaponServices;
        if (pawn is null || !pawn.IsValid || services is null)
        {
            yield break;
        }

        foreach (var handle in services.MyWeapons)
        {
            var weapon = handle.Value;
            if (weapon is not null && weapon.IsValid)
            {
                yield return weapon;
            }
        }
    }
}
