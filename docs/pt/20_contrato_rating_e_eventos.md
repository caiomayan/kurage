# Contrato de Rating, ELO e eventos de partida

[Voltar ao índice](./00_index.md)

**Estado:** aprovado pelo proprietário em 05/09/2026. O modelo competitivo e a
ingestão de rounds estão **implementados**; o plugin ainda não emite os eventos,
então nada roda em produção. As referências numéricas continuam pendentes de
recalibração contra dados reais.
**Última atualização:** 05/09/2026.

Este documento fecha os detalhes que o [plano de evolução](./19_plano_evolucao_identidade_rating_perfil.md)
§11 proíbe a implementação de inventar. Os pesos e referências foram definidos
pela implementação sob autorização do proprietário e vivem em
`CompetitiveScales`, versionados: recalibrar é publicar uma versão nova, nunca
editar valores já calculados.

---

## 1. O que ELO e Rating medem — e por que são medidas separadas

**ELO mede sucesso.** Ele responde: *este jogador ganha?* Sobe quando o resultado
vem, cai quando não vem, e leva em conta a força de quem estava do outro lado.

**Rating mede contribuição.** Ele responde: *este jogador é bom, e o quanto ele
faz para o resultado acontecer?* Vem da produção individual — abates, dano,
sobrevivência, participação — normalizada contra uma referência.

Os dois são medidas **independentes que se correlacionam**. Quem contribui mais
tende a vencer mais, então ELO subindo **tende** a acompanhar Rating bom. Mas é
só tendência, e é justamente a divergência que torna as duas úteis juntas:

| Situação | ELO | Rating | Leitura |
|---|---|---|---|
| Carrega times que perdem | baixo | alto | produz muito, resultado não vem |
| Aproveita times fortes | alto | baixo | ganha sem contribuir na mesma medida |
| Consistente | alto | alto | contribui e converte |

> **Correção de uma proposta anterior.** A primeira versão deste documento
> derivava o ELO do Rating (`elo_alvo = f(rating)`). Isso estava errado: se o ELO
> é função do Rating, ele deixa de ser uma segunda medida e vira uma
> reapresentação da primeira, e a correlação deixa de ser observável para virar
> tautologia. As duas passam a ser calculadas de fontes distintas.

**Decisão do proprietário:** o ELO é **um número global só**, alimentado pelos
resultados de todos os modos. Não há ELO por modo. Os rankings por modo, quando
existirem, ordenam pelo **Rating daquele modo**, que é a medida específica de
contribuição ali.

## 2. O que bloqueia tudo: não existe evento de round

Hoje o servidor envia apenas o heartbeat, com `steamId64`, time, `kills`,
`deaths`, `ping` e `isAlive`. Não há participação por round, dano, sobrevivência,
assistência nem resultado.

Sem os eventos da seção 7, **nada aqui roda de verdade**: `matchesPlayed` nunca
incrementa, a calibração jamais completa, e nem ELO nem Rating têm entrada.

**Implementado dos dois lados.** `POST /plugin/v1/servers/{id}/rounds` recebe,
valida, guarda o evento cru e fecha unidades; o `Kurage.Core` rastreia o round e
emite o evento ao final, com fila de reenvio para que uma falha de rede não perca
o round. O que falta agora é rodar com jogo real e recalibrar as referências.

## 3. Unidade válida por modo

| Modo | Unidade que fecha um ciclo | Estado |
|---|---|---|
| Retake | **bloco de 20 rounds**, acumuláveis entre sessões | **decidido** |
| 5v5 | uma partida concluída | proposta |
| Deathmatch | uma sessão de no mínimo 10 minutos contínuos | proposta |

Regras da unidade de retake, já decididas:

- um round conta se o jogador estava em **CT ou TR no início do round**;
- round com bots, aquecimento ou servidor em configuração não conta;
- reenvio do mesmo evento **não conta duas vezes**;
- desconexão **não zera** o bloco em andamento;
- o bloco fecha quando o vigésimo round é **processado**, não iniciado.

A triagem de calibração exige **5 unidades válidas** no modo.

## 4. ELO — proposta

### 4.1. Uma fórmula, três modos

Todo modo é reduzido a duas grandezas: o **score obtido** `S ∈ [0,1]` e a **força
do adversário** enfrentado. Com isso, o ELO é Elo clássico e a mesma
implementação serve para retake, DM e 5v5:

```
E     = 1 / (1 + 10^((elo_adv − elo) / D))     expectativa
elo'  = clamp(elo + K · (S − E), 0, 1000)
```

`D = 200`. Numa escala de 0 a 1000 com níveis de 100 pontos, 200 significa que
uma vantagem de um nível e meio dá cerca de 76% de expectativa. É um parâmetro da
versão, ajustável com dados.

`K` cai conforme a confiança aumenta:

| Situação | K |
|---|---:|
| Durante a calibração (5 primeiras unidades) | 32 |
| Depois da calibração | 16 |
| Acima de ELO 700 | 8 |

### 4.2. Como cada modo produz `S` e `elo_adv`

**5v5** — uma atualização por partida.
`S` = 1 vitória, 0 derrota, 0,5 empate.
`elo_adv` = média do ELO dos cinco adversários.

**Retake** — uma atualização por bloco de 20 rounds.
`S` = rounds vencidos pelo lado do jogador ÷ rounds que ele jogou no bloco.
`elo_adv` = média do ELO dos adversários enfrentados, ponderada por rounds.

**Deathmatch** — uma atualização por sessão.
`S` = colocação normalizada: com `N` participantes e posição `r` (1 é o melhor),
`S = (N − r) / (N − 1)`.
`elo_adv` = média do ELO dos demais participantes da sessão.

Um jogador que não é o melhor nem o pior da sessão de DM fica perto de `S = 0,5`,
que é exatamente o resultado neutro — a formulação não premia nem pune por
participar.

### 4.3. Por que isso responde ao modelo

O ELO só olha para resultado e para a força de quem estava do outro lado. Ele
não sabe quantos abates o jogador fez. É por isso que ele mede sucesso, e é por
isso que ele pode divergir do Rating.

## 5. Rating — proposta

### 5.1. Escala e leitura

**Centrado em 1.00**, por decisão do proprietário. `1.00` é o desempenho de
referência, `1.30` é bem acima, `0.80` é abaixo.

Este número **não é o HLTV Rating**, que é tratado separadamente na seção 6. A
interface chama este indicador apenas de **Rating**, e a versão do algoritmo
acompanha todo valor calculado.

### 5.2. Duas famílias de modo, uma máquina de cálculo

Retake e 5v5 são medidos **por round**; DM é medido **por minuto**, porque não
tem round. A normalização é a mesma nos dois casos: cada componente é dividido
pela sua referência da versão, e a soma ponderada dá 1.00 no desempenho de
referência.

**Modos por round — retake e 5v5:**

```
r_modo = 0.35·(KPR/KPR_ref)
       + 0.20·(ADR/ADR_ref)
       + 0.20·(KAST/KAST_ref)
       + 0.15·(SPR/SPR_ref)
       + 0.10·(MK/MK_ref)
```

| Sigla | Significado |
|---|---|
| KPR | abates por round |
| ADR | dano por round |
| KAST | proporção de rounds com abate, assistência, sobrevivência ou trade |
| SPR | taxa de sobrevivência |
| MK | proporção de rounds com 2 ou mais abates |

**Deathmatch — por minuto:**

```
r_dm = 0.40·(KPM/KPM_ref)
     + 0.25·(DMG_min/DMG_min_ref)
     + 0.25·(DPM_ref/DPM)
     + 0.10·(HS/HS_ref)
```

`DPM` entra invertido porque morrer menos é melhor. O DM não tem objetivo nem
jogo coletivo: ele mede duelo e mira, e por isso pesa menos no geral.

### 5.3. Referências iniciais

Retake é assimétrico — o CT retoma o bombsite e o TR ancora —, então as
referências são por lado, e o Rating do bloco é a média dos dois **ponderada
pelos rounds jogados em cada um**.

| Referência | Retake CT | Retake TR | 5v5 | DM |
|---|---:|---:|---:|---:|
| `KPR_ref` | 0,95 | 0,75 | 0,68 | — |
| `ADR_ref` | 105 | 88 | 78 | — |
| `KAST_ref` | 0,68 | 0,72 | 0,72 | — |
| `SPR_ref` | 0,34 | 0,50 | 0,32 | — |
| `MK_ref` | 0,15 | 0,10 | 0,10 | — |
| `KPM_ref` | — | — | — | 1,60 |
| `DMG_min_ref` | — | — | — | 165 |
| `DPM_ref` | — | — | — | 1,30 |
| `HS_ref` | — | — | — | 0,45 |

> **Estes números foram escolhidos antes de existir um único round do Kurage.**
> Se os jogadores daqui produzem mais do que a referência supõe, todo mundo
> aparece acima de 1.00 e o número deixa de significar "médio" — a escala fica
> deslocada.
>
> Isso não se resolve adivinhando melhor, se resolve medindo, e por isso existe
> o `ReferenceCalibrationService` da seção 5.4. As referências de 5v5 e DM só
> podem ser fixadas quando esses modos existirem.

### 5.4. Medir a referência em vez de estimá-la

`ReferenceCalibrationService` calcula, a partir dos rounds realmente gravados,
qual seria a referência observada de cada lado, e a compara com a embarcada,
mostrando o desvio.

- lê **somente rounds já absorvidos por uma unidade fechada**: um bloco em
  andamento ainda não é amostra completa;
- abaixo de **2.000 rounds por lado** ele diz "amostra insuficiente" e não
  publica número — uma média sobre poucos rounds é tão arbitrária quanto o chute
  que ela pretende substituir;
- ele **não altera nada**. Publicar novas referências é editar
  `CompetitiveScales` e subir a versão do algoritmo, uma decisão deliberada:
  trocar os números por baixo invalidaria silenciosamente todo Rating já
  calculado.

Com isso, recalibrar deixa de ser uma preocupação em aberto e vira um
procedimento com evidência: rodar o relatório, ler o desvio, decidir.

### 5.5. Confiabilidade e anti-farming

**Encolhimento para a base**, aplicado por modo antes da agregação:

```
r_modo_ajustado = (n·r_modo + k·1.00) / (n + k),  com k = 3 unidades
```

Com as 5 unidades mínimas, o peso da amostra própria é 5/8. Quem tem poucas
unidades não chega ao topo por sorte, e isso dispensa corte arbitrário.

**Janela deslizante de 30 unidades por modo.** Forma antiga decai, e um modo ruim
não é apagado ao parar de jogar: ele sai devagar. É a proteção contra omissão
estratégica que o documento 19 §5 pede.

**Volume não compra Rating.** É média ponderada, nunca soma: jogar mais aumenta a
confiabilidade, não o número.

### 5.6. Agregação entre modos

```
conf_m       = n_m / (n_m + 3)
Rating_geral = Σ(w_m · r_m · conf_m) / Σ(w_m · conf_m)
```

| Modo | Peso `w_m` |
|---|---:|
| 5v5 | 1,00 |
| Retake | 0,60 |
| Deathmatch | 0,30 |

Um modo **sem amostra sai das duas somas** — não entra como zero. É isso que
permite ao especialista em retake disputar o topo geral, como o documento 19 §5
exige. Hoje, com apenas retake ativo, o Rating geral é o Rating de retake.

## 6. HLTV Rating — estatística separada, só de 5v5

O HLTV Rating é um dado **adicional e real do jogador**, exibido apenas para as
partidas 5v5 que ele jogar. Ele **não compõe o Rating** da plataforma e não entra
no ELO.

### 6.1. Qual versão dá para implementar

Levantamento feito em 05/09/2026:

| Versão | Fórmula pública | Reproduzível |
|---|---|---|
| 1.0 | sim, publicada pela HLTV | exatamente |
| 2.0 | **não** — *"The exact formula won't be public this time"* | por engenharia reversa consolidada |
| 2.1 | **não** — *"The formula behind rating remains private"*; só mudanças qualitativas divulgadas | não, sem coeficientes |
| 3.0 | **não** — é `2.1 ± ajuste de eco ± Round Swing` | não, exige modelo proprietário |

O **Round Swing** da 3.0 compara a probabilidade de vitória do time antes e
depois de cada abate, conhecendo mapa, lado e economia do round, e divide o
crédito por dano final, participação no dano, assistência de flash e trade. Esse
modelo de probabilidade é o núcleo proprietário da HLTV; não há como reproduzi-lo
fielmente.

**Proposta: implementar a 2.0**, que é a maior versão com fórmula utilizável,
exibida com rótulo explícito de aproximação.

### 6.2. Fórmula

```
Impact     ≈ 2.13·KPR + 0.42·APR − 0.41
Rating 2.0 ≈ 0.0073·KAST + 0.3591·KPR − 0.5329·DPR
           + 0.2372·Impact + 0.0032·ADR + 0.1587
```

`APR` é assistências por round; `DPR`, mortes por round. Todos os insumos saem
do contrato de eventos da seção 7.

### 6.3. Regras de exibição

- exibido **somente** com amostra de 5v5, junto do número de rounds da amostra;
- rotulado como **aproximação da 2.0**, nunca como número oficial da HLTV. O
  documento 19 §4.1 é explícito: não rotular uma aproximação própria como HLTV
  oficial;
- a fonte da fórmula e a data do levantamento ficam registradas na versão do
  algoritmo;
- se a HLTV publicar coeficientes de uma versão maior, a implementação migra e o
  histórico é reprocessado sob a versão nova, conforme a seção 8.

### 6.4. Ideia derivada, para o nosso Rating

O conceito de Round Swing é bom e **é reproduzível com dados próprios** — bastaria
um modelo de probabilidade de vitória treinado sobre os nossos rounds. Isso seria
uma métrica **nossa**, não da HLTV, e entraria como componente do Rating numa
versão futura, quando houver volume de dados que justifique. Fica registrado como
direção, não como escopo.

## 7. Contrato de eventos do plugin — proposta

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
      "assists": 1,
      "damage": 187,
      "survived": false,
      "wasTraded": true,
      "openingKill": false,
      "openingDeath": false,
      "wasOnWinningSide": true
    }
  ]
}
```

`wasTraded` é necessário para o KAST — o T de trade. `openingKill` e
`openingDeath` sustentam o componente de impacto e o Round Swing futuro.

O deathmatch usa o mesmo endpoint com `gameMode: "DEATHMATCH"` e um evento por
sessão, com `durationSeconds` e a colocação de cada jogador no lugar de `side` e
`winningSide`.

- `sessionId` identifica um bloco contínuo do processo do servidor; `sequence` é
  monotônico dentro dele e detecta buraco ou reordenação;
- `idempotencyKey` é única por round e torna o reenvio seguro;
- a credencial é a **mesma já existente por servidor**, com hash SHA-256 e
  comparação em tempo constante.

| Situação | Resposta |
|---|---|
| Round aceito | `202 Accepted` |
| Reenvio da mesma `idempotencyKey` | `200 OK`, sem efeito |
| Credencial errada ou de outro servidor | `401` |
| Modo divergente do registrado | `409` |
| Sequência fora de ordem | `409`, registrado |

Um evento **nunca é aplicado pela metade**: ou o round inteiro entra, ou nada
entra.

## 8. Retenção e reprocessamento — proposta

- **eventos crus imutáveis** em `round_events`, unicidade na chave de
  idempotência, retidos **12 meses**;
- **toda linha calculada grava a versão do algoritmo**. Corrigir uma fórmula não
  é editar valores: é reprocessar os eventos sob uma versão nova, gerando linhas
  novas e **preservando as antigas** para auditoria;
- **evento inválido** é recusado na entrada e registrado, nunca aplicado
  parcialmente;
- **duplicata** é aceita sem efeito — é o comportamento esperado de um plugin que
  reenvia após perder a resposta;
- passados 12 meses os eventos crus são purgados e os **agregados por unidade
  permanecem**.

## 9. Level S, desempate e horas jogadas — **decidido e implementado**

**Level S:** os 30 primeiros do ranking geral entre calibrados, recalculado
**uma vez por dia, à meia-noite** (`America/Sao_Paulo`), nunca em tempo real.
Quem estiver no topo elegível naquele instante carrega o S o dia seguinte
inteiro. Com menos de 30 calibrados, todos recebem.

**Desempate:** ELO, depois K/D, depois **menos horas jogadas**, depois o
identificador, para que a ordem seja determinística.

**Horas jogadas:** `player_stats.playtime_seconds`, acumuladas pela presença
observada no heartbeat, com crédito limitado à janela de 90 segundos. Começa em
zero para todas as contas e só conta a partir do deploy.

## 10. Matriz OWNER/ADMIN — proposta

Hoje o `PermissionService` concede acesso irrestrito a `ADMIN` e `OWNER`. Isso
precisa ser substituído **antes de qualquer ação administrativa ser exposta**.

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

O ADMIN modera, o OWNER governa. Toda operação desta tabela precisa de registro
de auditoria durável, que ainda não existe e é pré-requisito para expô-las.

## 11. O que ainda falta decidir

1. **Confirmar as referências da seção 5.3** contra dados reais antes da ativação
   pública. Enquanto não houver dado, são chute informado.
2. **Referências de 5v5 e DM**, que só podem ser fixadas quando esses modos
   existirem.
3. **Temporadas:** o documento 19 §5.1 proíbe decaimento e reset sem nova
   decisão.
4. **Disputa de resultado:** quem contesta, em que prazo, e quem decide.

## 12. Fontes do levantamento sobre o HLTV Rating

- [Introducing Rating 2.0 — HLTV](https://www.hltv.org/news/20695/introducing-rating-20)
- [Introducing rating 2.1 — HLTV](https://www.hltv.org/news/40051/introducing-rating-21)
- [Introducing Rating 3.0 — HLTV](https://www.hltv.org/news/42485/introducing-rating-30)
- [Rating 3.0 adjustments go live — HLTV](https://www.hltv.org/news/43047/rating-30-adjustments-go-live)
- [Reverse Engineering the HLTV 2.0 Rating — flashed.gg](https://flashed.gg/posts/reverse-engineering-hltv-rating/)
- [How HLTV Rating 3.0 formula actually works — Escorenews](https://escorenews.com/en/csgo/article/71475-how-hltv-rating-3-0-formula-actually-works-round-swing-and-eco-adjustment-explained)

---

**Estado por seção:** 3 (retake), 4, 5, 7 e 9 estão implementadas. A seção 6
(HLTV) aguarda o modo 5v5 existir. A seção 8 tem o armazenamento cru pronto; a
purga aos 12 meses ainda não tem rotina. A seção 10 continua proposta e é
pré-requisito para expor qualquer ação administrativa.
