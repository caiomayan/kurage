# Integrações Externas (APIs & CDN)

> **Nota de estado (20/08/2026):** integrações são dependências externas sujeitas a
> termos, falhas e limites; consulte os riscos e contratos atuais na
> [auditoria factual](./08_auditoria_estado_atual.md).

[← Retornar ao Master Node](./00_index.md)

---

## 🌐 Visão Geral

O ecossistema **Kurage** integra exclusivamente serviços essenciais para a experiência competitiva de Counter-Strike 2, sem sobrecargas externas ou acoplamentos desnecessários.

---

## 1. Steam Web API & OpenID

- **OpenID 2.0:** Utilizado como o mecanismo primário de autenticação e criação de contas.
  O callback usa state one-time no Redis ligado a cookie HttpOnly, valida o
  provedor/identidade/`return_to` e confirma a assinatura com timeout. Consulte
  [Autenticação e segurança](./13_autenticacao_seguranca.md).
- **Steam Web API:**
  - `ISteamUser/GetPlayerSummaries/v0002/`: Utilizado na sincronização do perfil (`PUT /users/me/steam-sync`) para buscar o nickname Steam atual, avatar de alta resolução e status do perfil.
  - Não requer alteração no dashboard externo da Valve; as chaves configuradas em `STEAM_API_KEY` são reutilizadas diretamente.

---

## 2. Faceit Data API v4

- **Propósito:** Exibir estatísticas competitivas oficiais (Level Faceit 1-10, ELO, K/D Ratio, Win Rate e histórico recente de partidas).
- **Caching:** As consultas públicas à Faceit possuem cache de 5 minutos no Redis para evitar rate limits e manter tempos de resposta instantâneos.
- **Endpoints consumidos:**
  - `/players?nickname={name}`: Mapeia perfil e recupera `player_id`.
  - `/players/{player_id}/stats/cs2`: Extrai K/D, taxa de vitória e partidas totais.
  - `/players/{player_id}/history`: Últimos confrontos disputados.

---

## 3. Cloudflare R2 (Armazenamento S3)

- **Propósito:** Armazenamento de mídia estática (uploads de avatares customizados de jogadores e escudos/logos de times).
- **Pipeline seguro:** A API aceita até 5 MB, identifica o formato pelo conteúdo,
  permite somente PNG/JPEG, valida até 4096 pixels por lado e 16 milhões de
  pixels, decodifica e gera um novo PNG 512×512. Nome, MIME e metadados enviados
  pelo cliente não são reutilizados no objeto público. SVG, GIF e arquivos
  inválidos são recusados. O seletor web também aceita WebP, mas o recorte no
  navegador o converte para PNG antes do upload.
- **Entrega:** Cada alteração cria uma chave imutável e não previsível em
  `avatars/{userId}/{uuid}.png` ou `team-logos/{teamId}/{uuid}.png`, com
  `Content-Type: image/png`, `Content-Disposition: inline` e cache público
  imutável de um ano. O objeto anterior é removido somente após o novo URL ser
  persistido; falhas de persistência removem o novo objeto.
- **Proteção contra abuso:** uploads autenticados possuem limite próprio de 10
  operações por usuário/minuto no Redis e falham fechados quando o limitador não
  está disponível.
- **Configuração:** Compatível com protocolo S3 padrão (`AWS SDK v2`). O endpoint
  deve ser `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, sem o nome do bucket.
- **URL pública:** Em produção, o bucket deve ter um domínio público próprio, por
  exemplo `assets.caiomayan.com`. `CLOUDFLARE_R2_PUBLIC_URL` deve apontar
  para esse domínio, nunca para o domínio da aplicação web. O frontend deve
  receber a mesma origem em `NEXT_PUBLIC_R2_PUBLIC_URL`, para permiti-la na CSP.
- **Operação:** Não aplique expiração por idade indiscriminada aos prefixos, pois
  isso também removeria a imagem atualmente referenciada. Uma rotina futura de
  reconciliação deve comparar chaves do bucket com URLs ativas no PostgreSQL para
  coletar órfãos raros deixados por falha no commit ou indisponibilidade do R2.
