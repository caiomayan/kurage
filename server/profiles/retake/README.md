# Perfil local: Retake fixo

Este é o único perfil operacional necessário hoje. Ele representa o registro
`b1a2c3d4-0000-0000-0000-000000000001` criado pelo Flyway como `RETAKE/FIXED`.

## Plugins carregados

1. CounterStrikeSharp e Metamod;
2. [B3none/cs2-retakes](https://github.com/B3none/cs2-retakes), instalado a
   partir do release com configurações de mapas;
3. Inventory Simulator original;
4. Kurage.Core 2.4.9 ou superior;
5. Kurage.RetakeWeapons.

Não carregue MatchZy neste processo. Ele será parte exclusiva das futuras
instâncias `COMPETITIVE_5V5/EPHEMERAL`.

## Configuração

1. Inicie o servidor uma vez para o RetakesPlugin gerar sua configuração.
2. Instale `Kurage.Core.Contracts.dll` em
   `addons/counterstrikesharp/shared/Kurage.Core.Contracts/`.
3. Copie `Kurage.Core.json.example` para o diretório de configuração do
   `Kurage.Core` no servidor e use a mesma chave definida em
   `GAME_SERVER_API_KEY` no backend local. Essa chave pertence somente ao
   `ServerId` deste perfil: no boot, o backend grava apenas seu SHA-256 na linha
   do servidor. A chave deve ter pelo menos 32 caracteres; o plugin não carrega
   com credencial ausente ou fraca.
4. Copie `Kurage.RetakeWeapons.json.example` para o diretório de configuração do
   `Kurage.RetakeWeapons`.
5. Remova/desative qualquer outro allocator. O fallback nativo do RetakesPlugin
   pode permanecer ligado; a extensão preserva o loadout de respawn.
6. Copie `kurage-retake-local.cfg` para `game/csgo/cfg/`.
7. Inicie o CS2 em competitivo ou casual, conforme suportado pelo RetakesPlugin:

```text
-dedicated -usercon +game_type 0 +game_mode 1 +map de_mirage +maxplayers 10 +exec kurage-retake-local.cfg
```

O RetakesPlugin gera e executa sua própria `cfg/cs2-retakes/retakes.cfg`. Ajuste
primeiro apenas `MaxPlayers`, `MinimumPlayers`, auto-plant e mapas/spawns. O
`Kurage.RetakeWeapons` reaplica as regras de compra a cada round, evitando que a
ordem de execução desse CFG reabra categorias indevidas. Não é necessário fazer
fork do RetakesPlugin.

## Verificação

- `css_plugins list`: RetakesPlugin, InventorySimulator, Kurage.Core e
  Kurage.RetakeWeapons ativos, sem outro allocator;
- não há `!mode`/`css_mode`: a identidade fixa do servidor é comunicada ao jogador na entrada;
- `GET http://localhost:8080/servers`: registro Retake online após o heartbeat;
- ao entrar, skins e anexos vêm do Inventory Simulator, enquanto perfil e
  telemetria vêm do Kurage.Core;
- no início de cada round, a arma de spawn permanece e o menu B aceita
  rifles/AWP durante cinco segundos; a segunda AWP do time entra na fila.
