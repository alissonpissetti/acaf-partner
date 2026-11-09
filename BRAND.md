# Movly · identidade visual no portal

> movimento + corporativo + tech — "A energia de quem treina e a calma do bem-estar."

## Cores

| Token | Hex | Papel |
|---|---|---|
| `--movly-lime` | `#CBF74F` | Ação e energia: item ativo do menu, destaques, CTA de impacto. **Nunca** como texto sobre branco. |
| `--movly-purple` | `#8254E4` | Firmeza: botões principais, links, títulos de marca, menu lateral. |
| `--movly-sky` → `--movly-periwinkle` | `#89B4E0` → `#7579E5` | Gradiente "bem-estar": superfícies amplas (login, arcos decorativos). |
| `--movly-purple-strong` | `#6A3FD0` | Hover / texto roxo em tamanho pequeno. |
| `--movly-purple-deep` | `#2A1B57` | Texto sobre limão. |
| `--movly-ink` | `#1A1530` | Texto principal. |

Os componentes usam papéis, não hex: `--accent`, `--accent-strong`, `--accent-soft`, `--accent-border`, `--highlight`, `--on-highlight`. Trocar a marca = trocar os tokens em `src/styles/global.css`.

Combinações com boa leitura (manual): limão sobre roxo · roxo sobre limão · branco sobre roxo · gradiente sobre limão · limão sobre gradiente.

## Logo

- Componente: `<BrandLogo variant="lime|purple|white|gradient|black|wordmarkPurple" height={32} />` e `<BrandMark tone="lime|purple" />` (monograma "m.").
  - `wordmarkPurple`: vetor `movly-logo-purple.svg` — apenas o wordmark **movly.** em roxo (`#8254E4`) para fundo claro (sidebar, papel); não inclui o lockup “by ACAF”.
- Vetores extraídos do manual (glifos Soiren originais) em `src/brand/logoPaths.ts`.
- Arquivos estáticos: `public/branding/movly-logo-*.svg`, `movly-mark*.svg`, `public/favicon.svg`.

## Tipografia

| Uso | Manual | No portal (substituta livre, OFL) |
|---|---|---|
| Títulos, chamadas | Soiren | Unbounded |
| Texto, tabelas, formulários | Proxima Nova Semibold | Figtree |

Soiren e Proxima Nova são comerciais. Quando houver licença web, coloque os `.woff2` em `public/fonts/`, declare em `src/styles/fonts.css` e ponha o nome no início de `--font-display` / `--font-body`.

## Princípios de interface ("clean premium")

- A cor fica no conteúdo, não no cromo: menu e superfícies brancos, fundo cinza-violeta frio.
- Um único momento de marca por tela: no dashboard, o número do mês em Unbounded com o "." roxo do logo; no login, o wordmark gigante sangrando a borda.
- Item ativo do menu: pílula tinta (`--movly-ink`) com o ponto limão.
- Indicadores agrupados numa só superfície com divisórias, em vez de cartões soltos.
- Rótulos em caixa normal (sem CAIXA ALTA espaçada); sem sombras, só bordas finas.

## Recursos do manual aplicados

- **Grão de filme** nos gradientes: classe `.movly-grain` (login).
- **Pílulas de vidro com check limão** (Corpo · Mente · Alma) no painel do login.
- **Tags limão com texto roxo** para seleção: `.chip-active` (modalidades, filtros, abas).
- **Gradiente "blue sky" nos gráficos**: `url(#movly-fill-sky)` e `url(#movly-fill-purple)`, definidos em `<BrandGradients />`.
- **Wordmark gigante sangrando a borda** como elemento de campanha.

## Forma

Cantos generosos (`--radius` 16px, `--radius-lg` 24px), botões e tags em pílula (`--radius-pill`), arcos de círculo como elemento gráfico — "fluida no ponto certo, sem infantilidade".

## Tom de voz

Jovem, leve, direto. Pilares: bem-estar · movimento · equilíbrio · vida leve · se sentir bem.
Assinaturas: "A vida acontece quando você se move." · "O bem-estar começa no movimento." · "Bem-estar para empresas e colaboradores."
