using Kurage.Core.Config;
using Kurage.Core.Contracts;

namespace Kurage.Core.Extensions;

internal sealed class KurageCoreContext(
    Func<KurageCoreConfig> getConfig,
    Func<string> formatChatPrefix) : IKurageCoreContext
{
    public int ContractVersion => KurageCoreCapability.ContractVersion;
    public string ServerId => getConfig().ServerId;
    public string GameMode => getConfig().GameMode;
    public string ServerKind => getConfig().ServerKind;
    public string ServerDisplayName => getConfig().ServerDisplayName;
    public string ChatPrefix => KurageCorePlugin.ChatPrefixTemplate;

    public string FormatChatPrefix() => formatChatPrefix();

    public bool TryGetGlobalSetting(string name, out string value)
    {
        value = string.Empty;
        if (string.IsNullOrWhiteSpace(name))
        {
            return false;
        }

        var config = getConfig();
        var builtIn = name.Trim().ToUpperInvariant() switch
        {
            "SERVERID" => config.ServerId,
            "GAMEMODE" => config.GameMode,
            "SERVERKIND" => config.ServerKind,
            "SERVERDISPLAYNAME" => config.ServerDisplayName,
            "CHATPREFIX" => ChatPrefix,
            _ => null
        };

        if (builtIn is not null)
        {
            value = builtIn;
            return true;
        }

        foreach (var setting in config.ExtensionSettings)
        {
            if (string.Equals(setting.Key, name, StringComparison.OrdinalIgnoreCase))
            {
                value = setting.Value;
                return true;
            }
        }

        return false;
    }
}
