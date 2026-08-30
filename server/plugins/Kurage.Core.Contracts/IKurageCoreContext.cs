namespace Kurage.Core.Contracts;

/// <summary>
/// Public, non-secret server context exposed by Kurage.Core to official extensions.
/// </summary>
public interface IKurageCoreContext
{
    int ContractVersion { get; }
    string ServerId { get; }
    string GameMode { get; }
    string ServerKind { get; }
    string ServerDisplayName { get; }
    string ChatPrefix { get; }

    string FormatChatPrefix();
    bool TryGetGlobalSetting(string name, out string value);
}

public static class KurageCoreCapability
{
    public const string Name = "kurage:core";
    public const int ContractVersion = 1;
}
