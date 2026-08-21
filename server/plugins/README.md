# Kurage CS2 plugins

Plugins oficiais do Kurage para servidores dedicados de Counter-Strike 2 usando
C#/.NET 10 e CounterStrikeSharp 1.0.371.

## Estado factual

### `Kurage.Core`

- envia mapa, modo rotulado e roster ao `POST /servers/{id}/heartbeat`;
- consulta perfil/ELO ao conectar;
- mostra mensagens e comandos `!kurage`/`!elo`;
- mantém cache de perfil durante a sessão.

O comando `css_mode` hoje só muda o rótulo enviado ao backend e ainda precisa de
permissão administrativa. Rank, clan tag e fallback de ELO possuem divergências de
contrato descritas na auditoria.

### `Kurage.Inventory`

- consulta `GET /inventory/{steamId64}` no connect/spawn/`!sync`;
- mantém o JSON em cache e informa a quantidade ao jogador.

**O plugin ainda não aplica skins, floats, stickers, charms, facas ou loadout às
armas do jogo.** Ele é um protótipo de sincronização, não um skin engine.

## Build

Requer o SDK .NET 10:

```powershell
dotnet restore Kurage.Core/Kurage.Core.csproj
dotnet build Kurage.Core/Kurage.Core.csproj -c Release
dotnet restore Kurage.Inventory/Kurage.Inventory.csproj
dotnet build Kurage.Inventory/Kurage.Inventory.csproj -c Release
```

O ambiente da auditoria tinha somente runtime .NET 8 e não pôde validar o build.
Ainda faltam testes C#, solution/global.json, lockfile e CI.

## Configuração

Use HTTPS fora de loopback. Cada servidor deverá receber uma credencial própria;
o segredo global atual é temporário e não está aprovado para produção.

```json
{
  "ApiUrl": "http://127.0.0.1:8080",
  "ServerId": "00000000-0000-0000-0000-000000000000",
  "ServerApiKey": "replace-with-a-per-server-secret",
  "HeartbeatIntervalSeconds": 30,
  "EnableWelcomeChatMessages": true,
  "ChatPrefix": "[KURAGE]",
  "WebsiteUrl": "http://localhost:3000"
}
```

Antes de produção: API `/plugin/v1` versionada, segredo por servidor, replay
protection, lifecycle cancelável, cooldown/single-flight e testes em servidor
dedicado.

## Licença

Esta pasta é distribuída sob [MIT](./LICENSE). A escolha é necessária para usar a
exceção oficial concedida a plugins que referenciam os pacotes publicados do
CounterStrikeSharp. O restante do monorepo permanece proprietário.

