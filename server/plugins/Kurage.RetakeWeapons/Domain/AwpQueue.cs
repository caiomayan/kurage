namespace Kurage.RetakeWeapons.Domain;

internal sealed class AwpQueue
{
    private readonly Dictionary<int, List<QueueEntry>> _entries = new();
    private long _sequence;

    public int Enqueue(ulong steamId, int team)
    {
        var existingQueue = GetTeamQueue(team);
        var existingIndex = existingQueue.FindIndex(entry => entry.SteamId == steamId);
        if (existingIndex >= 0)
        {
            return existingIndex + 1;
        }

        Remove(steamId);
        existingQueue.Add(new QueueEntry(steamId, ++_sequence));
        return existingQueue.Count;
    }

    public bool Remove(ulong steamId)
    {
        var removed = false;
        foreach (var queue in _entries.Values)
        {
            removed |= queue.RemoveAll(entry => entry.SteamId == steamId) > 0;
        }

        return removed;
    }

    public ulong? TakeWinner(
        int team,
        IReadOnlyDictionary<ulong, RoundPerformance> performance,
        Func<ulong, bool> isEligible)
    {
        var queue = GetTeamQueue(team);
        queue.RemoveAll(entry => !isEligible(entry.SteamId));

        var winner = queue
            .OrderByDescending(entry => performance.TryGetValue(entry.SteamId, out var stats) ? stats.Score : 0)
            .ThenBy(entry => entry.Sequence)
            .FirstOrDefault();

        if (winner is null)
        {
            return null;
        }

        queue.Remove(winner);
        return winner.SteamId;
    }

    public void Clear()
    {
        _entries.Clear();
        _sequence = 0;
    }

    private List<QueueEntry> GetTeamQueue(int team)
    {
        if (!_entries.TryGetValue(team, out var queue))
        {
            queue = new List<QueueEntry>();
            _entries[team] = queue;
        }

        return queue;
    }

    private sealed record QueueEntry(ulong SteamId, long Sequence);
}
