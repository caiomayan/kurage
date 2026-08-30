import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Uso Aceitável",
  robots: { index: false, follow: false },
};

export default function AcceptableUsePage() {
  return (
    <LegalDocument
      eyebrow="Comunidade · versão preliminar"
      title="Política de Uso Aceitável"
      summary="Limites simples para manter partidas, perfis e infraestrutura seguros."
      sections={[
        {
          title: "Jogo limpo",
          content: <p>Não use cheats, automação indevida, exploração de falhas, smurfing coordenado, manipulação de partidas ou qualquer técnica para fabricar ranking e estatísticas.</p>,
        },
        {
          title: "Respeito",
          content: <p>Assédio, ameaça, discriminação, perseguição, exposição de dados pessoais, impersonação e conteúdo ilegal não são permitidos em perfis, times ou servidores.</p>,
        },
        {
          title: "Infraestrutura",
          content: <p>É proibido contornar autenticação ou limites, varrer sistemas, causar indisponibilidade, distribuir malware, abusar de APIs, automatizar scraping ou acessar recursos sem autorização expressa.</p>,
        },
        {
          title: "Aplicação",
          content: <p>Violações podem resultar em remoção de conteúdo, invalidação de partidas, suspensão ou encerramento de conta. Casos graves podem ser preservados e encaminhados às autoridades quando houver obrigação legal.</p>,
        },
        {
          title: "Recurso e denúncia",
          content: <p>O canal oficial de denúncia e recurso será publicado antes da abertura da comunidade. Denúncias devem trazer contexto e evidências legítimas, sem expor dados de terceiros publicamente.</p>,
        },
      ]}
    />
  );
}
