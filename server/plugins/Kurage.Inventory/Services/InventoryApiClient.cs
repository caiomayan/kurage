using System.Net.Http.Headers;
using System.Text.Json;
using Kurage.Inventory.Config;
using Kurage.Inventory.Models;
using Microsoft.Extensions.Logging;

namespace Kurage.Inventory.Services;

public class InventoryApiClient
{
    private readonly HttpClient _httpClient;
    private readonly InventoryConfig _config;
    private readonly ILogger _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    public InventoryApiClient(InventoryConfig config, ILogger logger)
    {
        _config = config;
        _logger = logger;
        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(5)
        };
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
    }

    public async Task<RawInventoryResponse?> FetchPlayerInventoryAsync(string steamId64)
    {
        try
        {
            var url = $"{_config.ApiUrl.TrimEnd('/')}/inventory/{steamId64}";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("[Kurage.Inventory] Non-success response {Status} for SteamID {SteamId}", response.StatusCode, steamId64);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<RawInventoryResponse>(json, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Kurage.Inventory] Error fetching inventory for SteamID {SteamId}", steamId64);
            return null;
        }
    }
}
