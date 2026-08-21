using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes.Registration;
using CounterStrikeSharp.API.Modules.Commands;
using CounterStrikeSharp.API.Modules.Timers;
using CounterStrikeSharp.API.Modules.Utils;
using Kurage.Core.Config;
using Kurage.Core.Models;
using Kurage.Core.Services;
using Microsoft.Extensions.Logging;

namespace Kurage.Core;

public class KurageCorePlugin : BasePlugin, IPluginConfig<KurageCoreConfig>
{
    public override string ModuleName => "Kurage.Core";
    public override string ModuleVersion => "1.1.0";
    public override string ModuleAuthor => "Kurage Team";
    public override string ModuleDescription => "Plugin principal de telemetria, modos de jogo e integracao de servidores Kurage.";

    public KurageCoreConfig Config { get; set; } = new();
    private KurageApiClient? _apiClient;
    private CounterStrikeSharp.API.Modules.Timers.Timer? _heartbeatTimer;
    private readonly Dictionary<ulong, PlayerProfileSummary> _playerCache = new();
    private bool _isMapLoaded = false;
    private string _currentGameMode = "COMPETITIVE_5V5";

    public void OnConfigParsed(KurageCoreConfig config)
    {
        Config = config;
        _currentGameMode = string.IsNullOrWhiteSpace(config.DefaultGameMode) ? "COMPETITIVE_5V5" : config.DefaultGameMode;
    }

    public override void Load(bool hotReload)
    {
        _apiClient = new KurageApiClient(Config, Logger);
        _currentGameMode = string.IsNullOrWhiteSpace(Config.DefaultGameMode) ? "COMPETITIVE_5V5" : Config.DefaultGameMode;

        Logger.LogInformation("=================================================");
        Logger.LogInformation("[Kurage.Core] Inicializando Plugin Principal v{Version}", ModuleVersion);
        Logger.LogInformation("[Kurage.Core] Conectado a Kurage API: {ApiUrl}", Config.ApiUrl);
        Logger.LogInformation("[Kurage.Core] Server ID: {ServerId}", Config.ServerId);
        Logger.LogInformation("[Kurage.Core] Modo Inicial: {Mode}", _currentGameMode);
        Logger.LogInformation("=================================================");

        // Register Map Listeners
        RegisterListener<Listeners.OnMapStart>(OnMapStart);
        RegisterListener<Listeners.OnMapEnd>(OnMapEnd);

        // Register periodic Heartbeat timer (30s)
        var interval = Math.Max(10, Config.HeartbeatIntervalSeconds);
        _heartbeatTimer = AddTimer(interval, OnHeartbeatTimerTick, TimerFlags.REPEAT);

        if (hotReload)
        {
            _isMapLoaded = true;
        }
    }

    public override void Unload(bool hotReload)
    {
        _heartbeatTimer?.Kill();
        _heartbeatTimer = null;
        _playerCache.Clear();
        _isMapLoaded = false;
        Logger.LogInformation("[Kurage.Core] Descarregado com sucesso.");
    }

    private void OnMapStart(string mapName)
    {
        _isMapLoaded = true;
        SendHeartbeat();
    }

    private void OnMapEnd()
    {
        _isMapLoaded = false;
    }

    private void OnHeartbeatTimerTick()
    {
        if (!_isMapLoaded) return;
        SendHeartbeat();
    }

    private void SendHeartbeat()
    {
        if (_apiClient == null || !_isMapLoaded) return;

        try
        {
            var mapName = Server.MapName;
            if (string.IsNullOrWhiteSpace(mapName)) return;

            var players = Utilities.GetPlayers();
            var validPlayers = players?.Where(p => p != null && p.IsValid && !p.IsBot).ToList() ?? new List<CCSPlayerController>();
            var currentPlayers = validPlayers.Count;
            var maxPlayers = Server.MaxPlayers;
            var currentMode = _currentGameMode;

            var playerList = new List<ServerPlayerPayload>();
            foreach (var p in validPlayers)
            {
                var team = p.TeamNum switch
                {
                    3 => "CT",
                    2 => "TR",
                    _ => "SPEC"
                };

                var matchStats = p.ActionTrackingServices?.MatchStats;
                playerList.Add(new ServerPlayerPayload
                {
                    SteamId64 = p.SteamID.ToString(),
                    Username = p.PlayerName,
                    Team = team,
                    Kills = matchStats?.Kills ?? 0,
                    Deaths = matchStats?.Deaths ?? 0,
                    Ping = (int)p.Ping,
                    IsAlive = p.PawnIsAlive
                });
            }

            Task.Run(async () =>
            {
                try
                {
                    await _apiClient.SendHeartbeatAsync(mapName, currentPlayers, maxPlayers, currentMode, playerList);
                }
                catch (Exception ex)
                {
                    Logger.LogWarning("[Kurage.Core] Erro ao enviar heartbeat assincrono: {Message}", ex.Message);
                }
            });
        }
        catch (Exception ex)
        {
            Logger.LogWarning("[Kurage.Core] Falha ao coletar dados para heartbeat: {Message}", ex.Message);
        }
    }

    [GameEventHandler]
    public HookResult OnPlayerConnectFull(EventPlayerConnectFull @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (player == null || !player.IsValid || player.IsBot)
        {
            return HookResult.Continue;
        }

        var steamId64 = player.SteamID.ToString();
        var steamIdUlong = player.SteamID;

        Task.Run(async () =>
        {
            try
            {
                if (_apiClient == null) return;
                var summary = await _apiClient.GetPlayerSummaryAsync(steamId64);

                if (summary != null)
                {
                    lock (_playerCache)
                    {
                        _playerCache[steamIdUlong] = summary;
                    }

                    // Apply clan tag and chat welcome on main thread
                    Server.NextFrame(() =>
                    {
                        if (!player.IsValid) return;

                        // Apply Clan Tag
                        if (!string.IsNullOrWhiteSpace(summary.ClanTag))
                        {
                            player.Clan = summary.ClanTag;
                        }
                        else if (summary.IsVerifiedPro)
                        {
                            player.Clan = "PRO";
                        }

                        // Welcome Chat Message
                        if (Config.EnableWelcomeChatMessages)
                        {
                            var prefix = FormatChatPrefix();
                            player.PrintToChat($" {prefix} Bem-vindo(a) ao servidor {ChatColors.LightBlue}O Mar{ChatColors.Default}!");
                            player.PrintToChat($" {prefix} Modo Atual: {ChatColors.Yellow}{GetModeDisplayName(_currentGameMode)}{ChatColors.Default} | Seu ELO: {ChatColors.Green}{summary.KurageElo}{ChatColors.Default}");
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Logger.LogWarning("[Kurage.Core] Erro ao carregar dados do jogador: {Message}", ex.Message);
            }
        });

        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnPlayerDisconnect(EventPlayerDisconnect @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (player != null && player.IsValid)
        {
            lock (_playerCache)
            {
                _playerCache.Remove(player.SteamID);
            }
        }

        return HookResult.Continue;
    }

    [ConsoleCommand("css_mode", "Visualiza ou altera o modo de jogo do servidor (5v5, retake, dm, practice)")]
    [ConsoleCommand("css_modo", "Visualiza ou altera o modo de jogo do servidor (5v5, retake, dm, practice)")]
    [CommandHelper(whoCanExecute: CommandUsage.CLIENT_AND_SERVER)]
    public void OnModeCommand(CCSPlayerController? player, CommandInfo command)
    {
        var prefix = FormatChatPrefix();

        if (command.ArgCount < 2)
        {
            var currentDisplay = GetModeDisplayName(_currentGameMode);
            var infoMsg = $" {prefix} Modo atual: {ChatColors.Green}{currentDisplay}{ChatColors.Default} ({_currentGameMode})\n" +
                          $" {prefix} Modos suportados: {ChatColors.Yellow}!mode 5v5{ChatColors.Default} | {ChatColors.Yellow}!mode retake{ChatColors.Default} | {ChatColors.Yellow}!mode dm{ChatColors.Default} | {ChatColors.Yellow}!mode practice{ChatColors.Default}";
            
            if (player != null && player.IsValid)
            {
                player.PrintToChat(infoMsg);
            }
            else
            {
                command.ReplyToCommand(infoMsg);
            }
            return;
        }

        var input = command.GetArg(1).Trim().ToLowerInvariant();
        string? targetMode = null;
        string targetDisplay = "";

        switch (input)
        {
            case "5v5":
            case "comp":
            case "competitivo":
            case "competitive":
            case "five":
            case "five_v_five":
                targetMode = "COMPETITIVE_5V5";
                targetDisplay = "5v5 Competitivo";
                break;
            case "retake":
            case "retakes":
                targetMode = "RETAKE";
                targetDisplay = "Retake";
                break;
            case "dm":
            case "deathmatch":
            case "mata-mata":
                targetMode = "DEATHMATCH";
                targetDisplay = "Deathmatch";
                break;
            case "practice":
            case "treino":
            case "pratica":
                targetMode = "PRACTICE";
                targetDisplay = "Practice / Treino";
                break;
            default:
                var invalidMsg = $" {prefix} Modo '{input}' desconhecido. Modos disponiveis: {ChatColors.Yellow}5v5, retake, dm, practice{ChatColors.Default}";
                if (player != null && player.IsValid)
                {
                    player.PrintToChat(invalidMsg);
                }
                else
                {
                    command.ReplyToCommand(invalidMsg);
                }
                return;
        }

        _currentGameMode = targetMode;
        Logger.LogInformation("[Kurage.Core] Modo do servidor alterado para: {Mode} ({Display}) por {Executor}", targetMode, targetDisplay, player?.PlayerName ?? "Console");

        var broadcastMsg = $" {prefix} Modo do servidor alterado para: {ChatColors.Green}{targetDisplay}{ChatColors.Default}!\n" +
                           $" {prefix} Sincronizando com a plataforma Kurage...";
        Server.PrintToChatAll(broadcastMsg);

        // Immediate sync to update platform Web interface in real time
        SendHeartbeat();
    }

    [ConsoleCommand("css_kurage", "Exibe informacoes sobre a plataforma Kurage")]
    [CommandHelper(whoCanExecute: CommandUsage.CLIENT_AND_SERVER)]
    public void OnKurageCommand(CCSPlayerController? player, CommandInfo command)
    {
        var prefix = FormatChatPrefix();
        var message = $" {prefix} Servidor oficial conectado a plataforma: {ChatColors.LightBlue}{Config.WebsiteUrl}{ChatColors.Default}";
        
        if (player != null && player.IsValid)
        {
            player.PrintToChat(message);
        }
        else
        {
            command.ReplyToCommand(message);
        }
    }

    [ConsoleCommand("css_elo", "Exibe seu ELO atual no Kurage")]
    [CommandHelper(whoCanExecute: CommandUsage.CLIENT_ONLY)]
    public void OnEloCommand(CCSPlayerController? player, CommandInfo command)
    {
        if (player == null || !player.IsValid) return;

        var prefix = FormatChatPrefix();
        lock (_playerCache)
        {
            if (_playerCache.TryGetValue(player.SteamID, out var summary))
            {
                player.PrintToChat($" {prefix} Jogador: {ChatColors.White}{player.PlayerName}{ChatColors.Default}");
                player.PrintToChat($" {prefix} ELO: {ChatColors.Green}{summary.KurageElo}{ChatColors.Default} | Rank: {ChatColors.Yellow}#{summary.RankPosition ?? 1}{ChatColors.Default}");
            }
            else
            {
                player.PrintToChat($" {prefix} Seus dados estao sendo sincronizados com a plataforma...");
            }
        }
    }

    private static string GetModeDisplayName(string mode)
    {
        return mode.ToUpperInvariant() switch
        {
            "COMPETITIVE_5V5" or "FIVE_V_FIVE" => "5v5 Competitivo",
            "RETAKE" => "Retake",
            "DEATHMATCH" or "DM" => "Deathmatch",
            "PRACTICE" => "Practice / Treino",
            _ => mode
        };
    }

    private string FormatChatPrefix()
    {
        return $"{ChatColors.Blue}[{ChatColors.LightBlue}KURAGE{ChatColors.Blue}]{ChatColors.Default}";
    }
}
