# Movly · Portal do parceiro

Painel web para a academia parceira gerenciar unidades, check-ins, alunos e repasses no ecossistema Movly (`../connect-app`).

Identidade visual: ver [BRAND.md](./BRAND.md).

## Funcionalidades

- **Multi-unidade** — troca entre unidades da rede parceira
- **Check-in** — validação na recepção
- **Comercial** — planos, diárias e alunos pelo app
- **Dados cadastrais** — fotos, horários e descrição (Guia no app)
- **Financeiro** — extrato e repasses

Rotas antigas (`/planos`, `/repasses`, etc.) redirecionam automaticamente.

- **Domínio compartilhado** — `shared/connect_domain.json` → Flutter via `npm run sync:shared`

## Rodar

Mapa completo dos três apps locais: [`../DEV-LOCAL.md`](../DEV-LOCAL.md).

**1. API** (obrigatório):

```bash
cd ../acaf-api
npm install
npm run start:dev
```

API em [http://127.0.0.1:8787](http://127.0.0.1:8787)

**2. Portal** (frontend):

```bash
cd acaf-partner
npm install
npm run dev
```

- Portal: [http://127.0.0.1:5176](http://127.0.0.1:5176)
- Com `VITE_API_URL` **vazio**, o Vite encaminha `/api` e `/shared` para a API (`VITE_API_PROXY_TARGET`, padrão `8787`). **Não** exporte `VITE_API_URL=http://127.0.0.1:8790` salvo que a API esteja realmente nessa porta.

Dados operacionais (redes, unidades, alunos, check-ins) persistem no **MariaDB** via `connect-api`. Cadastros são feitos pelo painel administrativo (`connect-adm`) e pelo próprio portal do parceiro.

## Sincronizar domínio com Flutter

```bash
npm run sync:shared
```

Copia `shared/connect_domain.json` para `../connect-app/assets/shared/connect_domain.json`.

No app associado, opcional em debug:

```dart
GymPortalApi.baseUrl = 'http://127.0.0.1:8787';
```

Ao comprar diária, o app registra o código na API (`POST /api/check-ins/issue`) para a recepção validar.
