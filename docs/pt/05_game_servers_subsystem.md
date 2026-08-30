# Subsistema de Servidores de CS2

> **Estado em 25/08/2026:** um servidor local `RETAKE/FIXED` é o perfil
> operacional. DM fixo e Mix 5v5 sob demanda estão arquitetados, mas ainda não
> provisionados.

[← Retornar ao índice](./00_index.md)

## Topologia escolhida

| Serviço | Identidade | Ciclo de vida | Estado atual |
|---|---|---|---|
| Retake | `RETAKE/FIXED` | 24/7 | perfil local ativo |
| Deathmatch | `DEATHMATCH/FIXED` | 24/7 | futuro |
| Mix 5v5 | `COMPETITIVE_5V5/EPHEMERAL` | uma partida | futuro |

Cada processo de CS2 possui um `ServerId` único e nasce com um único conjunto de
plugins. Servidor Retake não alterna para DM ou Mix. Kurage.Core não expõe
`!mode`/`css_mode`: a identidade fixa é comunicada na entrada do jogador.

## Contrato de identidade e heartbeat

PostgreSQL é a fonte autoritativa para `gameMode` e `serverKind`. O plugin repete
esses valores no heartbeat apenas para detectar configuração incorreta. Uma
divergência retorna `409 Conflict`; o heartbeat nunca reclassifica o registro.
Cada `ServerId` possui uma credencial própria: o plugin envia o segredo em
`X-Server-Api-Key`, a API calcula SHA-256 e compara em tempo constante com o hash
daquele registro. Uma chave de outro servidor retorna `401`; ausência de hash
falha fechado com `503`. O segredo em texto puro nunca é persistido.
No perfil local, o ID estável do Retake #1 é usado para provisionar somente o
hash mesmo quando a reconciliação completa de endpoint está desabilitada.

```json
{
  "currentMap": "de_mirage",
  "currentPlayers": 7,
  "maxPlayers": 10,
  "ctScore": 4,
  "trScore": 3,
  "gameMode": "RETAKE",
  "serverKind": "FIXED",
  "players": []
}
```

Mapa, jogadores, capacidade, status online e `lastHeartbeat` são estado observado
e podem ser atualizados. O roster enriquecido continua efêmero no Redis.

## Persistência

`game_servers` contém identidade e telemetria:

```sql
game_servers (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  hostname VARCHAR(255) NOT NULL,
  port INT NOT NULL,
  game_mode VARCHAR(20) NOT NULL,
  server_kind VARCHAR(20) NOT NULL,
  current_map VARCHAR(50),
  current_players INT NOT NULL,
  max_players INT NOT NULL,
  ct_score INT NOT NULL,
  tr_score INT NOT NULL,
  is_online BOOLEAN NOT NULL,
  last_heartbeat TIMESTAMPTZ,
  api_key_hash VARCHAR(64),
  UNIQUE (hostname, port)
)
```

O heartbeat é considerado válido por 90 segundos. Depois dessa janela, API,
cache Redis e frontend tratam a instância como offline e descartam roster,
lotação e placar voláteis. A rotina de persistência verifica servidores vencidos
a cada 30 segundos; o cliente aplica a mesma expiração mesmo quando a API fica
temporariamente indisponível.

## Experiência web

A home e `/mar` consultam a coleção real de servidores e agrupam somente
instâncias `FIXED` em Retake e Deathmatch. Cada grupo aceita vários servidores.
A ausência de um modo aparece como indisponibilidade operacional, sem criar ID,
endereço, mapa, jogadores ou placar fictícios. O detalhe é aberto por
`/mar?server=<uuid>` e reaproveita as telas de telemetria existentes.
Jogadores Steam ainda não vinculados continuam visíveis pelo nome reportado pelo
jogo, mas não recebem Kurage ID, nível, ELO, link de perfil ou hovercard
artificiais.

## Provisionamento futuro de Mix

O backend web não deve abrir containers diretamente. Um control plane deverá:

1. criar uma alocação com duas lobbies, mapa e lease idempotente;
2. reservar CPU, memória e porta em um node agent da VPS;
3. criar a linha `COMPETITIVE_5V5/EPHEMERAL` e uma credencial de instância;
4. iniciar um container com MatchZy, Inventory Simulator e Kurage.Core, injetando
   `KURAGE_SERVER_ID`, `KURAGE_GAME_MODE` e `KURAGE_SERVER_KIND`;
5. aguardar readiness/heartbeat antes de entregar o endereço aos jogadores;
6. drenar e destruir a instância ao terminar ou expirar o lease, liberando os
   recursos mesmo após falha.

O limite deve ser calculado por recursos reservados, não apenas por contagem de
containers. São necessários margem do SO, lock transacional de alocação,
timeouts, reconciliação e limpeza de órfãos. A fronteira de credencial individual
já está pronta; o futuro provisionador deverá gerar, injetar e rotacionar um
segredo independente para cada lease.

## Perfil Retake atual

O perfil executável e o checklist local estão em
[`server/profiles/retake`](../../server/profiles/retake). O RetakesPlugin permanece
upstream e controla round, equipes, spawns e bomba. O `Kurage.RetakeWeapons`, uma
extensão obrigatória do `Kurage.Core`, preserva a arma primária de spawn, abre o
menu B por cinco segundos, limita compras a pistolas/rifles/AWP, mantém preferência de
pistola e controla uma fila de AWP por time baseada no desempenho do round
anterior. Não há fork do RetakesPlugin nem um allocator genérico concorrente.

O Core 2.4 publica o contrato `kurage:core` por uma assembly compartilhada. A
extensão herda identidade, modo, nome do servidor e a tag fixa; segredos de API
não fazem parte desse contrato. Novos valores globais podem ser publicados em
`ExtensionSettings` sem duplicar JSON entre plugins.

O menu nativo só filtra categorias. Como AWP, Scout e automáticas pertencem à
categoria de snipers, Scout e automáticas ainda podem aparecer no cliente, mas a
extensão recusa e reembolsa essas compras. Ocultá-las individualmente exigiria
uma modificação de Panorama no cliente.
