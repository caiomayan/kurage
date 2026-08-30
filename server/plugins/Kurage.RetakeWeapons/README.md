# Kurage.RetakeWeapons

Extensão oficial e obrigatoriamente dependente do `Kurage.Core` para servidores
Retake. Ela mantém o menu de compra nativo do CS2 e implementa somente as regras
que não podem ser expressas com segurança pelos CVARs do jogo.

## Comportamento

- abre a compra em qualquer lugar por cinco segundos;
- mantém pistolas e rifles liberados e bloqueia SMGs, escopetas, pesadas,
  granadas, equipamento, Scout e rifles automáticos;
- preserva a arma primária recebida no respawn; o menu B serve para trocar a
  arma apenas quando o jogador quiser;
- memoriza a última pistola comprada durante a sessão do servidor e a reaplica
  nos rounds seguintes;
- permite uma AWP por time e bloqueia a vaga até o fim do round;
- impede descartar a AWP durante o round, evitando multiplicação por compra/drop;
- coloca tentativas excedentes em uma fila por time, sem entradas duplicadas;
- remove o jogador da fila quando ele compra outro rifle; pistolas não alteram a
  fila;
- no round seguinte, entrega a AWP ao jogador da fila com melhor desempenho no
  round anterior. O desempate favorece quem entrou antes.

O desempenho considera dano em adversários, eliminações, assistências e objetivo,
com penalidade por dano aliado. Os pesos são configuráveis no JSON do plugin.

## Dependência do Core

O plugin não duplica configurações globais. Ele consome a capability
`kurage:core`, fornecida pelo `Kurage.Core` 2.4.0, e herda `ServerId`, modo,
tipo/nome do servidor, a tag fixa já formatada e valores futuros publicados em
`ExtensionSettings`. `ServerApiKey` não é exposta a extensões.

Se o Core não estiver carregado, o contrato compartilhado não estiver instalado
ou o Core declarar um modo diferente de `RETAKE`, o plugin falha na inicialização
com uma mensagem explícita.

## Instalação

1. copie `Kurage.Core.Contracts.dll` para
   `addons/counterstrikesharp/shared/Kurage.Core.Contracts/`;
2. copie `Kurage.Core.dll` para
   `addons/counterstrikesharp/plugins/Kurage.Core/`;
3. copie `Kurage.RetakeWeapons.dll` para
   `addons/counterstrikesharp/plugins/Kurage.RetakeWeapons/`;
4. instale o B3none/cs2-retakes normalmente e mantenha o Inventory Simulator
   original em seu próprio diretório;
5. reinicie o processo e confirme a ordem no `css_plugins list`: Core antes de
   RetakeWeapons.

O fallback do RetakesPlugin pode permanecer habilitado para distribuir armas,
utilitários e o cenário inicial. A extensão preserva esse loadout e só substitui
a primária do vencedor quando concede uma AWP pela fila. Não carregue outro
allocator de armas simultaneamente.

## Limitação do menu nativo

`mp_buy_allow_guns` agrupa AWP, Scout e rifles automáticos na mesma classe de
snipers. Para manter a AWP clicável no menu B, o cliente também pode mostrar
Scout e automáticas; o servidor recusa essas compras, remove a arma e reembolsa o
valor. Ocultar somente esses itens exigiria alterar o Panorama do cliente, o que
está fora do escopo de um servidor puro.
