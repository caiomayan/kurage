using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes.Registration;
using CounterStrikeSharp.API.Modules.Commands;
using CounterStrikeSharp.API.Modules.Utils;
using Kurage.Inventory.Config;
using Kurage.Inventory.Models;
using Kurage.Inventory.Services;
using Microsoft.Extensions.Logging;

namespace Kurage.Inventory;

public class KurageInventoryPlugin : BasePlugin, IPluginConfig<InventoryConfig>
{
    public override string ModuleName => "Kurage.Inventory";
    public override string ModuleVersion => "1.0.0";
    public override string ModuleAuthor => "Kurage Team";
    public override string ModuleDescription => "Modulo nativo de skins e loadout integrado a plataforma Kurage.";

    public InventoryConfig Config { get; set; } = new();
    private InventoryApiClient? _apiClient;
    private readonly Dictionary<ulong, RawInventoryResponse> _inventoryCache = new();

    public void OnConfigParsed(InventoryConfig config)
    {
        Config = config;
    }

    public override void Load(bool hotReload)
    {
        _apiClient = new InventoryApiClient(Config, Logger);

        Logger.LogInformation("=================================================");
        Logger.LogInformation("[Kurage.Inventory] Inicializando Modulo de Skins v{Version}", ModuleVersion);
        Logger.LogInformation("[Kurage.Inventory] Sincronizando com API: {ApiUrl}", Config.ApiUrl);
        Logger.LogInformation("=================================================");
    }

    public override void Unload(bool hotReload)
    {
        _inventoryCache.Clear();
        Logger.LogInformation("[Kurage.Inventory] Descarregado com sucesso.");
    }

    [GameEventHandler]
    public HookResult OnPlayerConnectFull(EventPlayerConnectFull @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (player == null || !player.IsValid || player.IsBot)
        {
            return HookResult.Continue;
        }

        RefreshPlayerInventory(player, silent: true);
        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnPlayerDisconnect(EventPlayerDisconnect @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (player != null && player.IsValid)
        {
            lock (_inventoryCache)
            {
                _inventoryCache.Remove(player.SteamID);
            }
        }

        return HookResult.Continue;
    }

    [GameEventHandler]
    public HookResult OnPlayerSpawn(EventPlayerSpawn @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (player == null || !player.IsValid || player.IsBot)
        {
            return HookResult.Continue;
        }

        if (Config.SyncOnSpawn)
        {
            // Verify if player has inventory cached
            lock (_inventoryCache)
            {
                if (!_inventoryCache.ContainsKey(player.SteamID))
                {
                    RefreshPlayerInventory(player, silent: true);
                }
            }
        }

        return HookResult.Continue;
    }

    [ConsoleCommand("css_sync", "Sincroniza seu inventario de skins ativo no Kurage")]
    [ConsoleCommand("css_ws", "Atalho para sincronizar skins")]
    [CommandHelper(whoCanExecute: CommandUsage.CLIENT_ONLY)]
    public void OnSyncCommand(CCSPlayerController? player, CommandInfo command)
    {
        if (player == null || !player.IsValid) return;

        player.PrintToChat($" {FormatChatPrefix()} Sincronizando seu inventario com a plataforma...");
        RefreshPlayerInventory(player, silent: false);
    }

    private void RefreshPlayerInventory(CCSPlayerController player, bool silent)
    {
        var steamId64 = player.SteamID.ToString();
        var steamIdUlong = player.SteamID;

        Task.Run(async () =>
        {
            try
            {
                if (_apiClient == null) return;
                var response = await _apiClient.FetchPlayerInventoryAsync(steamId64);

                if (response != null && response.Items != null)
                {
                    lock (_inventoryCache)
                    {
                        _inventoryCache[steamIdUlong] = response;
                    }

                    Server.NextFrame(() =>
                    {
                        if (!player.IsValid) return;

                        var count = response.Items.Count;
                        if (!silent)
                        {
                            player.PrintToChat($" {FormatChatPrefix()} {ChatColors.Green}{count} skins{ChatColors.Default} sincronizadas com sucesso para esta partida!");
                        }
                        else
                        {
                            Logger.LogInformation("[Kurage.Inventory] {Count} skins carregadas para {PlayerName} ({SteamId})", count, player.PlayerName, steamId64);
                        }
                    });
                }
                else
                {
                    if (!silent)
                    {
                        Server.NextFrame(() =>
                        {
                            if (player.IsValid)
                            {
                                player.PrintToChat($" {FormatChatPrefix()} {ChatColors.Yellow}Nenhuma skin encontrada no seu perfil Kurage.{ChatColors.Default} Crie suas skins em {Config.ApiUrl}");
                            }
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                Logger.LogWarning("[Kurage.Inventory] Erro ao sincronizar inventario: {Message}", ex.Message);
            }
        });
    }

    private string FormatChatPrefix()
    {
        return $"{ChatColors.Blue}[{ChatColors.LightBlue}KURAGE·SKINS{ChatColors.Blue}]{ChatColors.Default}";
    }
}
