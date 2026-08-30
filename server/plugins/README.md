# Plugins oficiais Kurage

Plugins do Kurage para servidores dedicados de Counter-Strike 2, usando C#/.NET
10 e CounterStrikeSharp 1.0.371.

O repositório mantém o `Kurage.Core`, seu contrato compartilhado e extensões
oficiais estreitas. Skins, adesivos e chaveiros no jogo continuam sob
responsabilidade do Inventory Simulator original de Ian Lucas.

## Componentes

### Kurage.Core

- confirma a identidade imutável do processo (`ServerId`, `GameMode` e
  `ServerKind`);
- envia mapa, capacidade, placar CT/TR e roster ao `POST /servers/{id}/heartbeat`;
- consulta perfil, nível e ELO reais na entrada do jogador, sem fabricar valores
  para perfis ausentes ou ainda em calibração;
- oferece `!kurage` e `!elo`; o modo não é um comando e não pode ser alterado em jogo;
- aceita configuração por JSON ou variáveis `KURAGE_*`, facilitando instâncias
  efêmeras em containers;
- publica a capability segura `kurage:core` para extensões oficiais herdarem
  identidade, nome, modo e apresentação global sem receber `ServerApiKey`.

### Kurage.Core.Contracts

Assembly mínimo compartilhado que define `IKurageCoreContext`. Deve existir uma
única vez em `addons/counterstrikesharp/shared/Kurage.Core.Contracts/`; não copie
uma versão privada para dentro de cada plugin.

### Kurage.RetakeWeapons

Extensão de Retake responsável pela compra nativa, preferência de pistola,
restrições de primários e fila de uma AWP por time. Consulte o
[`README` específico](./Kurage.RetakeWeapons/README.md).

O `Kurage.Core` não liga/desliga Retakes, Deathmatch ou MatchZy. Cada processo de
CS2 nasce com um perfil único de plugins e modo, definido no provisionamento.

## Build

Requer o SDK .NET 10:

```powershell
dotnet restore Kurage.Core/Kurage.Core.csproj
dotnet build Kurage.Core/Kurage.Core.csproj -c Release
dotnet restore Kurage.RetakeWeapons/Kurage.RetakeWeapons.csproj
dotnet build Kurage.RetakeWeapons/Kurage.RetakeWeapons.csproj -c Release
```

## Configuração local de Retake

Use o perfil versionado em [`../profiles/retake`](../profiles/retake). O JSON
esperado pelo plugin é:

```json
{
  "ApiUrl": "http://127.0.0.1:8080",
  "ServerId": "b1a2c3d4-0000-0000-0000-000000000001",
  "ServerApiKey": "replace-with-a-random-secret-of-at-least-32-characters",
  "GameMode": "RETAKE",
  "ServerKind": "FIXED",
  "ServerDisplayName": "Kurage Retake #1",
  "HeartbeatIntervalSeconds": 30,
  "EnableWelcomeChatMessages": true,
  "ExtensionSettings": {}
}
```

Variáveis disponíveis: `KURAGE_API_URL`, `KURAGE_SERVER_ID`,
`KURAGE_SERVER_API_KEY`, `KURAGE_GAME_MODE`, `KURAGE_SERVER_KIND` e
`KURAGE_SERVER_DISPLAY_NAME`.

`ChatPrefix` não é configurável: a marca fixa do Core é
`{Olive}KURAGE ⋅{Default}`. O CS2 não oferece aqua/teal exato no chat nativo; o
Core usa `Olive`, preservando a identidade aquática sem depender de cor customizada.

`ExtensionSettings` é o canal versionado para futuros requisitos globais de
extensões. Configurações específicas continuam no JSON da própria extensão.

O Core se recusa a carregar com chave vazia ou menor que 32 caracteres. Use a
mesma credencial aleatória configurada no backend; em produção, ela deve ser
injetada por `KURAGE_SERVER_API_KEY`, nunca gravada no JSON versionado.

## Licença

Esta pasta é distribuída sob [MIT](./LICENSE), conforme a exceção oficial para
plugins que referenciam os pacotes publicados do CounterStrikeSharp. O restante
do monorepo permanece proprietário.
