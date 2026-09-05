# Contrato de Rating, ELO e eventos de partida

[Voltar ao índice](./00_index.md)

**Estado:** **proposta para análise do proprietário. Nada aqui está implementado
nem ativo.**
**Última atualização:** 05/09/2026.

Este documento fecha os detalhes que o [plano de evolução](./19_plano_evolucao_identidade_rating_perfil.md)
§11 proíbe a implementação de inventar. Ele existe para ser lido, corrigido e
aprovado — não para ser executado como está. Enquanto não houver aprovação
explícita, nenhum número daqui pode afetar o ranking público.

O que já foi decidido pelo proprietário e **está implementado** aparece marcado
como tal; o restante é proposta.

---

## 1. O que bloqueia tudo: não existe evento de round

Hoje o servidor envia apenas o heartbeat, com `steamId64`, time, `kills`,
`deaths`, `ping` e `isAlive` por jogador. Não há participação por round, dano,
sobrevivência nem resultado.

Sem os eventos da seção 6, **nada nesta proposta pode funcionar**: `matchesPlayed`
nunca incrementa, a calibração jamais completa, e o Rating não tem entrada. O
contrato de eventos é, portanto, a primeira entrega da etapa 5 — antes de
qualquer fórmula.

## 2. Unidade válida de calibração — **decidido**

**Um bloco válido de retake = 20 rounds**, acumuláveis ao longo de vários
retakes particionados. O jogador não precisa jogar os 20 de uma vez.

A triagem exige **5 blocos válidos**, ou seja 100 rounds de retake processados.

Detalhes que a implementação precisa respeitar:

- um round conta para o jogador se ele estava em **CT ou TR no início do round**.
  Entrar no meio do round, assistir ou estar conectando não conta;
- round com bots, aquecimento ou servidor em modo de configuração não conta;
- o mesmo evento reenviado **não conta duas vezes** — ver idempotência na seção 6;
- desconexão **não zera** o progresso do bloco em andamento; o jogador retoma de
  onde parou;
- o bloco só fecha quando o vigésimo round é **processado**, não quando é
  iniciado.

## 3. Rating — proposta

### 3.1. Escala

**Centrado em 1.00**, por decisão do proprietário: é a leitura que o jogador de
CS já tem pronta. `1.00` é o desempenho de referência, `1.30` é bem acima,
`0.80` é abaixo.

Isso **não é o HLTV Rating**. O §4.1 do documento 19 define o HLTV como um número
adicional, futuro e exclusivo de 5v5, que não compõe o Rating da plataforma. A
interface chama este indicador apenas de **Rating**, e a versão do algoritmo
acompanha todo valor calculado.

### 3.2. Componentes

Calculados por bloco de 20 rounds, normalizados contra **referências fixas da
versão** — não contra a média da população. Com uma dúzia de jogadores, uma média
móvel oscila demais para significar qualquer coisa, e faria o Rating de alguém
mudar sem que seu desempenho tivesse mudado.

```
Rating_bruto = 0.45·(KPR/KPR_ref)
             + 0.25·(ADR/ADR_ref)
             + 0.20·(SPR/SPR_ref)
             + 0.10·(MK/MK_ref)
```

| Sigla | Significado | Origem |
|---|---|---|
| KPR | abates por round | eventos |
| ADR | dano por round | eventos |
| SPR | taxa de sobrevivência | eventos |
| MK | proporção de rounds com 2+ abates | eventos |

**Referências iniciais, por lado**, porque o retake é assimétrico — o CT retoma o
bombsite e o TR ancora, e o mesmo KPR significa coisas diferentes:

| Referência | CT (retomando) | TR (ancorando) |
|---|---:|---:|
| `KPR_ref` | 0,95 | 0,75 |
| `ADR_ref` | 105 | 88 |
| `SPR_ref` | 0,34 | 0,50 |
| `MK_ref` | 0,15 | 0,10 |

O Rating do bloco é a média dos dois lados **ponderada pelos rounds jogados em
cada um**, para que um jogador que caiu mais vezes de um lado não seja premiado
nem punido por isso.

> **Estes números são um ponto de partida, não uma medida.** Precisam ser
> recalibrados sobre os primeiros ~10.000 rounds reais antes de qualquer ativação
> pública. Publicá-los sem essa checagem seria exatamente o tipo de número
> fabricado que a auditoria proíbe.

### 3.3. Confiabilidade e anti-farming

**Encolhimento para a base.** O valor exibido puxa para 1.00 enquanto a amostra é
pequena:

```
Rating_exibido = (n·Rating_bruto + k·1.00) / (n + k),  com k = 3 blocos
```

Com os 5 blocos mínimos, o peso da amostra própria é 5/8. Um jogador com poucos
blocos não chega ao topo por sorte, e isso dispensa qualquer corte arbitrário.

**Janela deslizante de 30 blocos.** Forma antiga decai. É também a proteção contra
omissão estratégica que o §5 pede: um modo ruim não é apagado ao parar de jogar,
ele sai da janela devagar.

**Volume não compra Rating.** O Rating é uma média ponderada, nunca uma soma:
jogar mais aumenta a confiabilidade, não o número.

### 3.4. Agregação entre modos (futuro)

Quando existir mais de um modo:

```
Rating_geral = Σ(w_m · r_m · conf_m) / Σ(w_m · conf_m)
```

com `w_5v5 = 1.0`, `w_retake = 0.6`, `w_dm = 0.3`, e `conf_m` entre 0 e 1 vindo do
tamanho da amostra daquele modo.

Um modo **sem amostra sai das duas somas** — não entra como zero. É isso que
permite ao especialista em retake disputar o topo geral, como o §5 exige.

## 4. ELO — proposta

O retake não tem confronto par a par, então o ELO não pode ser um Elo clássico.
Proposta: **ELO ancorado em desempenho**, movendo-se na direção do ELO que o
Rating recente sustenta.

```
elo_alvo(r) = clamp(200 + (r - 1.00)·600, 0, 1000)
elo_novo    = elo + K·(elo_alvo - elo),  com |Δ| ≤ 40 por bloco
K = 0.25 durante a calibração (5 primeiros blocos)
K = 0.08 depois
```

Rating 1.00 leva a ELO 200, que é exatamente o ELO inicial e o Level 3 já
documentados no documento 02 — a escala nova não contradiz a existente.

| Rating | ELO alvo | Nível |
|---:|---:|---:|
| 0,70 | 20 | 1 |
| 1,00 | 200 | 3 |
| 1,30 | 380 | 4 |
| 1,60 | 560 | 6 |
| 2,00 | 800 | 9 |

Níveis 1–10 continuam `(elo/100)+1`, limitados a 10. **Inatividade não reduz
ELO** e não remove ninguém do ranking — decisão registrada no §5.1.

## 5. Level S, desempate e horas jogadas — **decidido e implementado**

**Level S:** os 30 primeiros do ranking geral, entre jogadores calibrados.
Recalculado **uma vez por dia, à meia-noite** (`America/Sao_Paulo`), nunca em
tempo real: quem estiver no topo elegível naquele instante carrega o S durante
todo o dia seguinte, mesmo que o ELO mude no meio do dia. Com menos de 30
calibrados, todos recebem. A concessão fica registrada por data em
`level_s_grants`, o que também dá histórico auditável.

**Desempate do ranking**, nesta ordem:

1. maior ELO;
2. maior K/D;
3. **menos horas jogadas** na plataforma;
4. identificador do jogador, para que a ordem seja determinística e a vaga 30
   nunca fique ambígua.

**Horas jogadas** são persistidas em `player_stats.playtime_seconds`, acumuladas
a partir da presença observada no heartbeat. A medida é conservadora: cada
heartbeat credita apenas o intervalo desde o avistamento anterior, limitado à
janela de 90 segundos; silêncio do servidor não vira hora; espectador não
acumula. **O contador começa em zero para todas as contas e só conta a partir do
deploy** — é o tempo que a Kurage mediu, não o histórico do jogador no CS2.

## 6. Contrato de eventos do plugin — proposta

```
POST /plugin/v1/rounds
X-Server-Api-Key: <credencial do servidor>
```

```json
{
  "serverId": "uuid",
  "sessionId": "uuid",
  "sequence": 1234,
  "idempotencyKey": "uuid",
  "map": "de_mirage",
  "endedAt": "2026-09-05T03:14:00Z",
  "gameMode": "RETAKE",
  "winningSide": "CT",
  "players": [
    {
      "steamId64": "7656119...",
      "side": "CT",
      "kills": 2,
      "deaths": 1,
      "assists": 0,
      "damage": 187,
      "survived": false,
      "wasOnWinningSide": true
    }
  ]
}
```

- `sessionId` identifica um bloco contínuo do processo do servidor; `sequence` é
  monotônico dentro dele e permite detectar buraco ou reordenação;
- `idempotencyKey` é única por round e é o que torna o reenvio seguro;
- a credencial é a **mesma já existente por servidor**, com hash SHA-256 e
  comparação em tempo constante — o contrato não afrouxa a fronteira do
  documento 05.

**Respostas:**

| Situação | Resposta |
|---|---|
| Round aceito | `202 Accepted` |
| Reenvio da mesma `idempotencyKey` | `200 OK`, sem efeito |
| Credencial errada ou de outro servidor | `401` |
| Modo divergente do registrado | `409`, como já ocorre no heartbeat |
| Sequência fora de ordem | `409`, registrado para investigação |

Um evento **nunca é aplicado pela metade**: ou o round inteiro entra, ou nada
entra.

## 7. Retenção e reprocessamento — proposta

Respondendo à pergunta que ficou em aberto no §11:

- **eventos crus imutáveis** em `round_events`, com unicidade na chave de
  idempotência, retidos por **12 meses** — cobre uma temporada inteira e a janela
  de disputa;
- **toda linha calculada grava a versão do algoritmo** (`kurage-retake-1.0.0`).
  Corrigir a fórmula não é editar valores: é reprocessar os eventos sob uma
  versão nova, gerando linhas novas e **preservando as antigas** para auditoria;
- **evento inválido** (servidor desconhecido, credencial errada, sequência fora de
  ordem) é recusado na entrada e registrado, nunca aplicado parcialmente;
- **duplicata** pela chave de idempotência é aceita sem efeito — não é erro, é o
  comportamento esperado de um plugin que reenvia após perder a resposta;
- passados 12 meses os eventos crus são purgados e os **agregados por bloco
  permanecem** indefinidamente, porque são pequenos e sustentam o histórico.

## 8. Matriz OWNER/ADMIN — proposta

Hoje o `PermissionService` concede acesso irrestrito a `ADMIN` e `OWNER`: um
desvio geral de qualquer verificação. Isso é aceitável enquanto não existe painel
administrativo, e **precisa ser substituído antes de qualquer ação administrativa
ser exposta**.

| Operação | OWNER | ADMIN |
|---|:---:|:---:|
| Suspender ou reativar conta | sim | sim |
| Conceder ou revogar cargo | sim | **não** |
| Transferir propriedade da plataforma | sim | **não** |
| Marcar `isVerifiedPro` | sim | **não** |
| Conceder Maré manualmente | sim | **não** |
| Excluir time de terceiro | sim | sim |
| Editar apelido ou avatar de terceiro | sim | sim |
| Reprocessar resultado de partida | sim | **não** |

Princípio: o ADMIN modera, o OWNER governa. Nenhum ADMIN pode se autopromover,
conceder cargo ou alterar o que é vendido ou verificado editorialmente. Toda
operação desta tabela precisa de registro de auditoria durável — que ainda não
existe e é pré-requisito para expor qualquer uma delas.

## 9. O que ainda falta decidir

1. **Confirmar as referências da seção 3.2** contra rounds reais antes da
   ativação pública. Enquanto não houver dado, elas são chute informado.
2. **Pesos entre modos** (§3.4) quando o segundo modo existir.
3. **Temporadas:** o documento 19 §5.1 proíbe decaimento e reset sem nova decisão.
   Se houver temporada, definir o que zera e o que permanece.
4. **Disputa de resultado:** quem pode contestar, em que prazo, e quem decide.

---

Nenhuma parte das seções 3, 4, 6, 7 e 8 deve ser implementada antes da aprovação
do proprietário. As seções 2 e 5 já refletem decisões tomadas.
