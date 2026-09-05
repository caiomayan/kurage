namespace Kurage.Core.Services;

/// <summary>
/// Acumula o que cada jogador fez no round em andamento.
///
/// Deliberadamente livre de qualquer tipo do CounterStrikeSharp: o plugin
/// traduz os eventos do jogo para chamadas simples aqui, e assim as regras que
/// realmente importam — o que conta como trade, o que é abate de abertura, quem
/// participou do round — podem ser verificadas sem subir um servidor de CS2.
/// </summary>
public class RoundTracker
{
    /// <summary>
    /// Janela de trade. Uma morte é considerada vingada quando quem matou cai
    /// dentro deste intervalo. Cinco segundos é a convenção usada pelas
    /// estatísticas de CS.
    /// </summary>
    public const double TradeWindowSeconds = 5.0;

    private readonly Dictionary<ulong, PlayerRound> _players = new();
    private readonly List<PendingTrade> _recentDeaths = new();
    private bool _firstBloodTaken;

    public bool RoundInProgress { get; private set; }

    /// <summary>Estado acumulado de um jogador no round.</summary>
    public class PlayerRound
    {
        public ulong SteamId { get; init; }
        public string Side { get; set; } = "CT";
        public int Kills { get; set; }
        public int Deaths { get; set; }
        public int Assists { get; set; }
        public int Damage { get; set; }
        public bool Died { get; set; }
        public bool WasTraded { get; set; }
        public bool OpeningKill { get; set; }
        public bool OpeningDeath { get; set; }
    }

    private record PendingTrade(ulong VictimSteamId, ulong KillerSteamId, double AtSeconds);

    /// <summary>Começa um round novo, descartando o estado do anterior.</summary>
    public void StartRound()
    {
        _players.Clear();
        _recentDeaths.Clear();
        _firstBloodTaken = false;
        RoundInProgress = true;
    }

    public void EndRound() => RoundInProgress = false;

    /// <summary>
    /// Registra que o jogador estava em um lado no início do round.
    ///
    /// Só quem é registrado aqui entra no evento: o documento 20 §3 exige que o
    /// jogador estivesse em CT ou TR no início do round, então quem conecta no
    /// meio ou está assistindo não conta.
    /// </summary>
    public void RegisterParticipant(ulong steamId, string side)
    {
        if (!RoundInProgress) return;
        if (side != "CT" && side != "TR") return;

        if (_players.TryGetValue(steamId, out var existing))
        {
            existing.Side = side;
            return;
        }
        _players[steamId] = new PlayerRound { SteamId = steamId, Side = side };
    }

    /// <summary>Dano causado, já limitado pela vida que a vítima tinha.</summary>
    public void RecordDamage(ulong attackerSteamId, int damage)
    {
        if (!RoundInProgress || damage <= 0) return;
        if (_players.TryGetValue(attackerSteamId, out var attacker))
        {
            attacker.Damage += damage;
        }
    }

    /// <summary>
    /// Registra uma morte e resolve trades.
    ///
    /// Quando quem mata cai logo em seguida, a morte anterior daquele lado passa
    /// a contar como vingada — é o T do KAST.
    /// </summary>
    /// <param name="atSeconds">Instante do round, em segundos.</param>
    public void RecordDeath(ulong victimSteamId, ulong? killerSteamId, ulong? assisterSteamId, double atSeconds)
    {
        if (!RoundInProgress) return;

        if (_players.TryGetValue(victimSteamId, out var victim))
        {
            victim.Deaths++;
            victim.Died = true;
            if (!_firstBloodTaken) victim.OpeningDeath = true;
        }

        if (killerSteamId.HasValue && killerSteamId.Value != victimSteamId
            && _players.TryGetValue(killerSteamId.Value, out var killer))
        {
            killer.Kills++;
            if (!_firstBloodTaken) killer.OpeningKill = true;
        }

        if (assisterSteamId.HasValue && _players.TryGetValue(assisterSteamId.Value, out var assister))
        {
            assister.Assists++;
        }

        // Quem acabou de cair pode ter matado alguém há pouco. Se matou dentro
        // da janela, aquela morte estava sendo vingada agora.
        MarkTradedDeathsCausedBy(victimSteamId, atSeconds);

        _firstBloodTaken = true;

        if (killerSteamId.HasValue)
        {
            _recentDeaths.Add(new PendingTrade(victimSteamId, killerSteamId.Value, atSeconds));
        }
    }

    /// <summary>
    /// Marca como vingada toda morte recente causada por quem acabou de morrer.
    ///
    /// É a definição usual de trade: A cai para B, e B cai logo em seguida —
    /// então a morte de A foi trocada, e A recebe o T do KAST.
    /// </summary>
    private void MarkTradedDeathsCausedBy(ulong justDiedSteamId, double atSeconds)
    {
        for (int i = _recentDeaths.Count - 1; i >= 0; i--)
        {
            var pending = _recentDeaths[i];
            if (atSeconds - pending.AtSeconds > TradeWindowSeconds)
            {
                // Fora da janela e só envelhece: pode sair da lista.
                _recentDeaths.RemoveAt(i);
                continue;
            }
            if (pending.KillerSteamId != justDiedSteamId) continue;

            if (_players.TryGetValue(pending.VictimSteamId, out var avengedVictim))
            {
                avengedVictim.WasTraded = true;
            }
        }
    }

    /// <summary>
    /// Fecha o round e devolve o que cada participante fez.
    ///
    /// Sobreviveu é derivado de não ter morrido, e não de estar vivo no fim: os
    /// dois coincidem, mas o primeiro não depende do instante em que a leitura
    /// acontece.
    /// </summary>
    public IReadOnlyCollection<PlayerRound> Snapshot() => _players.Values.ToList();
}
