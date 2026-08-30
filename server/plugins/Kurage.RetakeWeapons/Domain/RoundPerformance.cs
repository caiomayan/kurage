namespace Kurage.RetakeWeapons.Domain;

internal sealed class RoundPerformance
{
    public int Damage { get; set; }
    public int Kills { get; set; }
    public int Assists { get; set; }
    public int Objectives { get; set; }
    public int FriendlyDamage { get; set; }
    public int Score { get; set; }
}

internal sealed class RoundPerformanceTracker
{
    private readonly Dictionary<ulong, RoundPerformance> _current = new();
    private IReadOnlyDictionary<ulong, RoundPerformance> _last = new Dictionary<ulong, RoundPerformance>();

    public IReadOnlyDictionary<ulong, RoundPerformance> LastRound => _last;

    public void AddEnemyDamage(ulong steamId, int damage) => Get(steamId).Damage += Math.Max(0, damage);
    public void AddFriendlyDamage(ulong steamId, int damage) => Get(steamId).FriendlyDamage += Math.Max(0, damage);
    public void AddKill(ulong steamId) => Get(steamId).Kills++;
    public void AddAssist(ulong steamId) => Get(steamId).Assists++;
    public void AddObjective(ulong steamId) => Get(steamId).Objectives++;

    public void CompleteRound(int damageWeight, int killWeight, int assistWeight, int objectiveWeight, int friendlyDamagePenalty)
    {
        foreach (var performance in _current.Values)
        {
            performance.Score =
                performance.Damage * damageWeight +
                performance.Kills * killWeight +
                performance.Assists * assistWeight +
                performance.Objectives * objectiveWeight -
                performance.FriendlyDamage * friendlyDamagePenalty;
        }

        _last = _current.ToDictionary(entry => entry.Key, entry => entry.Value);
        _current.Clear();
    }

    public void BeginRound() => _current.Clear();

    public void Clear()
    {
        _current.Clear();
        _last = new Dictionary<ulong, RoundPerformance>();
    }

    private RoundPerformance Get(ulong steamId)
    {
        if (!_current.TryGetValue(steamId, out var performance))
        {
            performance = new RoundPerformance();
            _current[steamId] = performance;
        }

        return performance;
    }
}
