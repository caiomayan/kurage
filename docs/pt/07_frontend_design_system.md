# Design System Kurage — Especificação Visual

> **Nota de estado (20/08/2026):** esta especificação visual não comprova
> acessibilidade ou implementação completa. O baseline e as lacunas WCAG estão na
> [auditoria factual](./08_auditoria_estado_atual.md).

[← Retornar ao Master Node](./00_index.md)

---

## 🎨 Filosofia Visual

A estética visual do **Kurage** une a **densidade informacional da HLTV**, o **acabamento tipográfico e de superfícies refinado da Apple** e a **calma operacional de produtos como Linear e Raycast**.

### 🚫 Regras Estritas de Design (Anti-IA Clichés)
- **Atenção aos Elementos:** Elementos (como texto, ícones ou avatares) **não devem** ter fundos (backgrounds) ou bordas a menos que haja contexto claro e razão suficiente para isso. Deve-se preservar um design limpo e estritamente justificado.
- **Zero Gradientes Decorativos:** Proibido o uso de textos em degradê ou bordas brilhantes/coloridas.
- **Zero Roxo em Tema Escuro:** Tons violetas ou purpúreos são terminantemente proibidos.
- **Estruturas Sólidas e Funcionais:** Nada de bento-boxes abarrotadas de ícones vazios ou cartões com 3 níveis de aninhamento.

---

## 🎨 Tokens de Cor

```css
/* Camadas de Profundidade (Apple Depth Model) */
--canvas: #090B0C;             /* Fundo da viewport principal */
--surface: #111516;            /* Superfícies de cards e painéis */
--surface-raised: #181D1C;     /* Popovers, modais, estados hover */
--surface-overlay: #1E2423;    /* Tooltips e hovercards (elevação máxima) */

/* Bordas Sutis */
--border: #29302F;             /* Linhas divisórias estruturais (1px) */
--border-subtle: #1F2524;      /* Separadores internos sutis */

/* Hierarquia de Tipografia */
--text-primary: #EEEDE9;       /* Títulos, números principais, botões */
--text-secondary: #8D9694;     /* Subtítulos, metadados, labels */
--text-tertiary: #5A6360;      /* Placeholders e elementos desabilitados */

/* Identidade da Marca (Sea Glass) */
--accent: #A9C8C0;             /* Destaque bioluminescente sutil */
--accent-muted: #7A9E94;       /* Variação de hover em elementos de ação */
--accent-subtle: #A9C8C020;    /* Tints de background discretos */

/* Cores Semânticas (Usadas apenas com contexto funcional) */
--success: #8ABBA4;
--warning: #D0BD7B;
--error: #C55B61;
--info: #7BA4C7;

/* Pódio do Ranking */
--gold: #D4A853;
--silver: #B0B8BF;
--bronze: #C2956B;
```

---

## 🔤 Tipografia

| Escala | Família | Tamanho | Peso | Tracking | Aplicação |
|---|---|---|---|---|---|
| **Display** | `Manrope` | 28–40px | 650 | -0.055em a -0.065em | Números de destaque, K/D, ELO hero |
| **Heading** | `Manrope` | 18–24px | 600 | -0.025em a -0.04em | Títulos de seção e páginas |
| **Subheading** | `Inter` | 15px | 600 | -0.015em | Cabeçalhos de tabelas e cards |
| **Body** | `Inter` | 13px | 400–500 | 0 | Textos corridos e descrições |
| **Small** | `Inter` | 12px | 400 | 0 | Metadados inline |
| **Label** | `Inter` | 10–11px | 600 | +0.08em a +0.12em | Eyebrows e tags em maiúsculas |
| **Mono** | `JetBrains Mono` | 12–13px | 400 | 0 | Steam IDs, IPs de servidores CS2 |

- **Obrigatório:** Aplicar `font-variant-numeric: tabular-nums` em todas as tabelas, placares e estatísticas numéricas para alinhamento horizontal impecável.

---

## 📐 Grid e Espaçamento
- **Base Grid:** `4px` (todos os espaçamentos são múltiplos: 4, 8, 12, 16, 20, 24, 32, 40, 48px).
- **Largura Máxima do Container:** `1180px` centralizado (`margin: 0 auto`).
- **Padding de Cards:** `16px` a `20px`.
- **Gutter entre Colunas:** `24px`.
