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
- **Entrega:** CDN Cloudflare com cache-busting automático via query timestamp (`?v={timestamp}`).
- **Configuração:** Compatível com protocolo S3 padrão (`AWS SDK v2`).
