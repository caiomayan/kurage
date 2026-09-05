using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Kurage.Core.Config;
using Kurage.Core.Models;
using Microsoft.Extensions.Logging;

namespace Kurage.Core.Services;

public class KurageApiClient
{
    private readonly HttpClient _httpClient;
    private readonly KurageCoreConfig _config;
    private readonly ILogger _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    public KurageApiClient(KurageCoreConfig config, ILogger logger)
    {
        _config = config;
        _logger = logger;
        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(5)
        };
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        if (!string.IsNullOrWhiteSpace(_config.ServerApiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("X-Server-Api-Key", _config.ServerApiKey);
        }

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
    }

    public async Task<bool> SendHeartbeatAsync(
        string mapName, 
        int currentPlayers, 
        int maxPlayers, 
        int ctScore,
        int trScore,
        string gameMode,
        string serverKind,
        List<ServerPlayerPayload>? players = null
    )
    {
        try
        {
            var payload = new ServerHeartbeatPayload
            {
                CurrentMap = mapName,
                CurrentPlayers = currentPlayers,
                MaxPlayers = maxPlayers,
                CtScore = ctScore,
                TrScore = trScore,
                GameMode = gameMode,
                ServerKind = serverKind,
                Players = players
            };

            var url = $"{_config.ApiUrl.TrimEnd('/')}/servers/{_config.ServerId}/heartbeat";
            var json = JsonSerializer.Serialize(payload, _jsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);
            if (response.IsSuccessStatusCode)
            {
                return true;
            }

            _logger.LogWarning("[Kurage.Core] Heartbeat failed with status: {StatusCode}", response.StatusCode);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("[Kurage.Core] Heartbeat exception: {Message}", ex.Message);
            return false;
        }
    }

    /// <summary>
    /// Envia um round concluído.
    ///
    /// A API responde 202 quando aceita e 200 quando reconhece o reenvio de um
    /// round que já tinha registrado — os dois são sucesso. Um reenvio depois de
    /// falha de rede é comportamento esperado, não erro, e a chave de
    /// idempotência garante que ele não conte duas vezes.
    /// </summary>
    public async Task<bool> SendRoundAsync(RoundEventPayload payload)
    {
        try
        {
            var url = $"{_config.ApiUrl.TrimEnd('/')}/plugin/v1/servers/{_config.ServerId}/rounds";
            var json = JsonSerializer.Serialize(payload, _jsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);
            if (response.IsSuccessStatusCode)
            {
                return true;
            }

            _logger.LogWarning(
                "[Kurage.Core] Round {Sequence} recusado com status {StatusCode}",
                payload.Sequence, response.StatusCode);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                "[Kurage.Core] Falha ao enviar round {Sequence}: {Message}",
                payload.Sequence, ex.Message);
            return false;
        }
    }

    public async Task<PlayerProfileSummary?> GetPlayerSummaryAsync(string steamId64)
    {
        try
        {
            var url = $"{_config.ApiUrl.TrimEnd('/')}/users/{steamId64}";
            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug("[Kurage.Core] Player {SteamId} not found in Kurage database.", steamId64);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<PlayerProfileSummary>(json, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("[Kurage.Core] Error fetching player summary for {SteamId}: {Message}", steamId64, ex.Message);
            return null;
        }
    }
}
