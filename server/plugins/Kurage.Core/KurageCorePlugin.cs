using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes.Registration;
using CounterStrikeSharp.API.Core.Capabilities;
using CounterStrikeSharp.API.Modules.Commands;
using CounterStrikeSharp.API.Modules.Timers;
using CounterStrikeSharp.API.Modules.Utils;
using Kurage.Core.Config;
using Kurage.Core.Contracts;
using Kurage.Core.Extensions;
using Kurage.Core.Models;
using Kurage.Core.Services;
using Microsoft.Extensions.Logging;

namespace Kurage.Core;

public class KurageCorePlugin : BasePlugin, IPluginConfig<KurageCoreConfig>
{
    // CS2 does not expose a reliable aqua/blue-grey chat color. Olive is the
    // closest muted water-adjacent native color selected for Kurage's tag.
    public const string ChatPrefixTemplate = "{Olive}KURAGE ⋅{Default}";
    private static readonly char BrandChatColor = ChatColors.Olive;

    public override string ModuleName => "Kurage.Core";
    public override string ModuleVersion => "2.4.9";
    public override string ModuleAuthor => "Kurage Team";
    public override string ModuleDescription => "Plugin principal de identidade e telemetria dos servidores Kurage.";

    public KurageCoreConfig Config { get; set; } = new();
    private KurageApiClient? _apiClient;
    private CounterStrikeSharp.API.Modules.Timers.Timer? _heartbeatTimer;
    private readonly Dictionary<ulong, PlayerProfileSummary> _playerCache = new();
    private static readonly PluginCapability<IKurageCoreContext> CoreCapability = new(KurageCoreCapability.Name);
    private bool _isMapLoaded = false;

    // Emissão de rounds. Sem isto o modelo competitivo não recebe entrada: o
    // heartbeat não carrega participação por round, então `matchesPlayed` nunca
    // avançaria e a calibração jamais completaria.
    private readonly RoundTracker _roundTracker = new();
    private Guid _sessionId = Guid.NewGuid();
    private long _roundSequence;
    private DateTimeOffset _roundStartedAt = DateTimeOffset.UtcNow;

    /// <summary>
    /// Rounds que a API ainda não confirmou. Uma falha de rede não pode perder
    /// um round; a chave de idempotência torna o reenvio seguro. A fila é
    /// limitada para que um servidor sem conectividade não cresça sem limite.
    /// </summary>
    private readonly Queue<RoundEventPayload> _pendingRounds = new();
    private const int MaxPendingRounds = 60;

    public void OnConfigParsed(KurageCoreConfig config)
    {
        config.ApiUrl = GetEnvironmentValue("KURAGE_API_URL") ?? config.ApiUrl;
        config.ServerId = GetEnvironmentValue("KURAGE_SERVER_ID") ?? config.ServerId;
        config.ServerApiKey = GetEnvironmentValue("KURAGE_SERVER_API_KEY") ?? config.ServerApiKey;
        config.GameMode = NormalizeGameMode(GetEnvironmentValue("KURAGE_GAME_MODE") ?? config.GameMode);
        config.ServerKind = NormalizeServerKind(GetEnvironmentValue("KURAGE_SERVER_KIND") ?? config.ServerKind);
        config.ServerDisplayName = GetEnvironmentValue("KURAGE_SERVER_DISPLAY_NAME") ?? config.ServerDisplayName;
        config.ExtensionSettings = new Dictionary<string, string>(
            config.ExtensionSettings ?? new Dictionary<string, string>(),
            StringComparer.OrdinalIgnoreCase);

        if (!Guid.TryParse(config.ServerId, out _))
        {
            throw new InvalidOperationException("Kurage.Core ServerId must be a valid UUID.");
        }
        if (string.IsNullOrWhiteSpace(config.ServerDisplayName))
        {
            throw new InvalidOperationException("Kurage.Core ServerDisplayName cannot be empty.");
        }
        if (string.IsNullOrWhiteSpace(config.ServerApiKey) || config.ServerApiKey.Length < 32)
        {
            throw new InvalidOperationException("Kurage.Core ServerApiKey must contain at least 32 characters.");
        }

        Config = config;
    }

    public override void Load(bool hotReload)
    {
        var coreContext = new KurageCoreContext(() => Config, FormatChatPrefix);
        Capabilities.RegisterPluginCapability(CoreCapability, () => coreContext);
        _apiClient = new KurageApiClient(Config, Logger);

        Logger.LogInformation("=================================================");
        Logger.LogInformation("[Kurage.Core] Inicializando Plugin Principal v{Version}", ModuleVersion);
        Logger.LogInformation("[Kurage.Core] Conectado a Kurage API: {ApiUrl}", Config.ApiUrl);
        Logger.LogInformation("[Kurage.Core] Server ID: {ServerId}", Config.ServerId);
        Logger.LogInformation("[Kurage.Core] Identidade: {Kind}/{Mode}", Config.ServerKind, Config.GameMode);
        Logger.LogInformation("[Kurage.Core] Servidor: {ServerDisplayName}", Config.ServerDisplayName);
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
        // Cada mapa é uma sessão nova: a sequência recomeça e não colide com a
        // do mapa anterior, que a API já aceitou.
        _sessionId = Guid.NewGuid();
        _roundSequence = 0;
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
            var (ctScore, trScore) = ReadTeamScores();
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
                    await _apiClient.SendHeartbeatAsync(
                        mapName,
                        currentPlayers,
                        maxPlayers,
                        ctScore,
                        trScore,
                        Config.GameMode,
                        Config.ServerKind,
                        playerList
                    );
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
    public HookResult OnRoundStart(EventRoundStart @event, GameEventInfo info)
    {
        _roundTracker.StartRound();
        _roundStartedAt = DateTimeOffset.UtcNow;

        // Só quem já está em um lado quando o round começa participa dele. Quem
        // conecta no meio ou está assistindo entra a partir do round seguinte,
        // como o documento 20 §3 exige.
        foreach (var player in Utilities.GetPlayers())
        {
            if (player == null || !player.IsValid || player.IsBot) continue;
            var side = SideOf(player.TeamNum);
            if (side != null)
            {
                _roundTracker.RegisterParticipant(player.SteamID, side);
            }
        }
        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnPlayerHurt(EventPlayerHurt @event, GameEventInfo info)
    {
        var attacker = @event.Attacker;
        var victim = @event.Userid;
        if (attacker == null || !attacker.IsValid || attacker.IsBot) return HookResult.Continue;
        // Dano em si mesmo e fogo amigo não contam como produção.
        if (victim != null && victim.IsValid && victim.TeamNum == attacker.TeamNum) return HookResult.Continue;

        _roundTracker.RecordDamage(attacker.SteamID, @event.DmgHealth);
        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnPlayerDeath(EventPlayerDeath @event, GameEventInfo info)
    {
        var victim = @event.Userid;
        if (victim == null || !victim.IsValid || victim.IsBot) return HookResult.Continue;

        var attacker = @event.Attacker;
        var assister = @event.Assister;
        ulong? killer = attacker != null && attacker.IsValid && !attacker.IsBot
            ? attacker.SteamID
            : null;
        ulong? assist = assister != null && assister.IsValid && !assister.IsBot
            ? assister.SteamID
            : null;

        var atSeconds = (DateTimeOffset.UtcNow - _roundStartedAt).TotalSeconds;
        _roundTracker.RecordDeath(victim.SteamID, killer, assist, atSeconds);
        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnRoundEnd(EventRoundEnd @event, GameEventInfo info)
    {
        if (!_roundTracker.RoundInProgress) return HookResult.Continue;
        _roundTracker.EndRound();

        try
        {
            var participants = _roundTracker.Snapshot();
            if (participants.Count == 0) return HookResult.Continue;

            // 3 é CT e 2 é TR na numeração de times do CS2.
            var winningSide = @event.Winner switch
            {
                3 => "CT",
                2 => "TR",
                _ => null
            };

            var payload = new RoundEventPayload
            {
                SessionId = _sessionId.ToString(),
                Sequence = ++_roundSequence,
                IdempotencyKey = Guid.NewGuid().ToString(),
                Map = Server.MapName,
                EndedAt = DateTimeOffset.UtcNow,
                GameMode = Config.GameMode,
                WinningSide = winningSide,
                Players = participants.Select(p => new RoundPlayerPayload
                {
                    SteamId64 = p.SteamId.ToString(),
                    Side = p.Side,
                    Kills = p.Kills,
                    Deaths = p.Deaths,
                    Assists = p.Assists,
                    Damage = p.Damage,
                    Survived = !p.Died,
                    WasTraded = p.WasTraded,
                    OpeningKill = p.OpeningKill,
                    OpeningDeath = p.OpeningDeath
                }).ToList()
            };

            EnqueueRound(payload);
            FlushPendingRounds();
        }
        catch (Exception ex)
        {
            Logger.LogWarning("[Kurage.Core] Falha ao montar o round: {Message}", ex.Message);
        }
        return HookResult.Continue;
    }

    /// <summary>
    /// Coloca o round na fila de envio, descartando o mais antigo quando ela
    /// enche. Perder o round mais velho é preferível a crescer sem limite num
    /// servidor sem conectividade.
    /// </summary>
    private void EnqueueRound(RoundEventPayload payload)
    {
        if (_pendingRounds.Count >= MaxPendingRounds)
        {
            var dropped = _pendingRounds.Dequeue();
            Logger.LogWarning(
                "[Kurage.Core] Fila cheia: round {Sequence} descartado sem confirmação",
                dropped.Sequence);
        }
        _pendingRounds.Enqueue(payload);
    }

    /// <summary>
    /// Tenta enviar tudo que está pendente, em ordem.
    ///
    /// Para no primeiro que falhar para não furar a sequência: a API recusa
    /// sequência fora de ordem, e reenviar o resto antes do que falhou só
    /// produziria 409.
    /// </summary>
    private void FlushPendingRounds()
    {
        if (_apiClient == null || _pendingRounds.Count == 0) return;

        var batch = _pendingRounds.ToArray();
        _pendingRounds.Clear();

        Task.Run(async () =>
        {
            var unsent = new List<RoundEventPayload>();
            foreach (var round in batch)
            {
                if (unsent.Count > 0)
                {
                    unsent.Add(round);
                    continue;
                }
                var sent = await _apiClient.SendRoundAsync(round);
                if (!sent) unsent.Add(round);
            }

            if (unsent.Count > 0)
            {
                Server.NextFrame(() =>
                {
                    foreach (var round in unsent) EnqueueRound(round);
                });
            }
        });
    }

    private static string? SideOf(int teamNum) => teamNum switch
    {
        3 => "CT",
        2 => "TR",
        _ => null
    };

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

                        if (Config.EnableWelcomeChatMessages)
                        {
                            PrintWelcome(player, summary);
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

    [ConsoleCommand("css_kurage", "Exibe informações sobre este servidor Kurage")]
    [CommandHelper(whoCanExecute: CommandUsage.CLIENT_AND_SERVER)]
    public void OnKurageCommand(CCSPlayerController? player, CommandInfo command)
    {
        var prefix = FormatChatPrefix();
        var message = $"{prefix} Você tá no {BrandChatColor}{Config.ServerDisplayName}{ChatColors.Default} · " +
                      $"{ChatColors.Yellow}{GetModeDisplayName(Config.GameMode)}{ChatColors.Default}.";
        
        if (player != null && player.IsValid)
        {
            PrintStyledChat(player, message);
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
                PrintStyledChat(player, $"{prefix} Jogador: {ChatColors.White}{player.PlayerName}{ChatColors.Default}");
                if (summary.KurageElo is int elo)
                {
                    var rank = summary.RankPosition is int position
                        ? $" | Rank: {ChatColors.Yellow}#{position}{ChatColors.Default}"
                        : string.Empty;
                    PrintStyledChat(player, $"{prefix} ELO: {ChatColors.Green}{elo}{ChatColors.Default}{rank}");
                }
                else
                {
                    PrintStyledChat(player, $"{prefix} Seu ELO ainda está {ChatColors.Yellow}em calibração{ChatColors.Default}.");
                }
            }
            else
            {
                PrintStyledChat(player, $"{prefix} Seus dados estao sendo sincronizados com a plataforma...");
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

    private static string FormatChatPrefix()
    {
        // The initial regular space is required by CS2's chat parser before its
        // control codes. Without it, the client may render the whole line white.
        // The separator belongs to a prefix followed by text on the same line.
        return $" {ChatColors.Default}{BrandChatColor}KURAGE ⋅{ChatColors.Default}";
    }

    private void PrintWelcome(CCSPlayerController player, PlayerProfileSummary summary)
    {
        // Keep the block left-aligned like native server chat. A space-only
        // message makes each group breathe without relying on empty messages.
        PrintStyledChat(player, $"{BrandChatColor}KURAGE{ChatColors.Default}");
        PrintStyledChat(player, $"{ChatColors.White}Bem-vindo, {ChatColors.Gold}{player.PlayerName}{ChatColors.Default}.");
        PrintChatSpacer(player);

        PrintStyledChat(player, $"{BrandChatColor}{Config.ServerDisplayName}{ChatColors.Default} · {ChatColors.Gold}{GetModeDisplayName(Config.GameMode)}{ChatColors.Default}");
        if (summary.KurageLevel is int level && summary.KurageElo is int elo)
        {
            PrintStyledChat(player, $"{ChatColors.Grey}Nível Kurage {BrandChatColor}{level}{ChatColors.Grey} · ELO {ChatColors.Green}{elo}{ChatColors.Default}");
        }
        else
        {
            PrintStyledChat(player, $"{ChatColors.Grey}Seu perfil Kurage está {ChatColors.Yellow}em calibração{ChatColors.Default}.");
        }
        PrintChatSpacer(player);

        PrintStyledChat(player, $"{ChatColors.Grey}{GetWelcomeModeMessage(Config.GameMode)}{ChatColors.Default}");
    }

    private static void PrintChatSpacer(CCSPlayerController player)
    {
        player.PrintToChat($"{ChatColors.Default} ");
    }

    private static void PrintStyledChat(CCSPlayerController player, string message)
    {
        player.PrintToChat($" {ChatColors.Default}{message}");
    }

    private static string GetWelcomeModeMessage(string mode)
    {
        return mode.ToUpperInvariant() switch
        {
            "RETAKE" => $"{ChatColors.Gold}Retake{ChatColors.Grey} tá on. Fecha com o time e {ChatColors.Green}busca o round{ChatColors.Default}.",
            "DEATHMATCH" or "DM" => $"{ChatColors.Gold}DM{ChatColors.Grey} tá on. Entra, troca e {ChatColors.Green}segue o baile{ChatColors.Default}.",
            "COMPETITIVE_5V5" or "FIVE_V_FIVE" => $"{ChatColors.Gold}5v5 valendo{ChatColors.Default}. Informação, mira e {ChatColors.Green}jogo junto{ChatColors.Default}.",
            "PRACTICE" => $"{ChatColors.Gold}Treino aberto{ChatColors.Default}. Testa, ajusta e fica {ChatColors.Green}mais afiado{ChatColors.Default}.",
            _ => $"{ChatColors.Green}Tá tudo pronto{ChatColors.Default} por aqui. Bom jogo."
        };
    }

    private static string? GetEnvironmentValue(string name)
    {
        var value = Environment.GetEnvironmentVariable(name);
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static (int CtScore, int TrScore) ReadTeamScores()
    {
        var ctScore = 0;
        var trScore = 0;

        foreach (var team in Utilities.FindAllEntitiesByDesignerName<CCSTeam>("cs_team_manager"))
        {
            if (team == null || !team.IsValid) continue;

            if (team.TeamNum == (byte)CsTeam.CounterTerrorist)
            {
                ctScore = Math.Max(0, team.Score);
            }
            else if (team.TeamNum == (byte)CsTeam.Terrorist)
            {
                trScore = Math.Max(0, team.Score);
            }
        }

        return (ctScore, trScore);
    }

    private static string NormalizeGameMode(string value)
    {
        return value.Trim().ToUpperInvariant() switch
        {
            "RETAKE" or "RETAKES" => "RETAKE",
            "DEATHMATCH" or "DM" => "DEATHMATCH",
            "COMPETITIVE_5V5" or "FIVE_V_FIVE" or "5V5" => "COMPETITIVE_5V5",
            "PRACTICE" => "PRACTICE",
            _ => throw new InvalidOperationException($"Unsupported Kurage.Core GameMode: {value}")
        };
    }

    private static string NormalizeServerKind(string value)
    {
        return value.Trim().ToUpperInvariant() switch
        {
            "FIXED" => "FIXED",
            "EPHEMERAL" => "EPHEMERAL",
            _ => throw new InvalidOperationException($"Unsupported Kurage.Core ServerKind: {value}")
        };
    }
}
