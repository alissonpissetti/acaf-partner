# ACAF Connect · Portal do parceiro (mockup)

Painel web + **API mock** para a academia associada configurar unidades no app **ACAF Connect** (`../acaf-app`).

## Funcionalidades

- **Multi-unidade** — troca entre unidades da rede (ex.: Carpe Portão / Batel)

## Menu do portal

1. **Dashboard** — tela inicial  
2. **Check-in** — validação na recepção  
3. **Comercial** — Planos Connect, Diárias, Alunos pelo app  
4. **Dados cadastrais** — fotos, horários, descrição (Guia no app)  
5. **Financeiro** — Extrato financeiro, Saques  

Rotas antigas (`/planos`, `/repasses`, etc.) redirecionam automaticamente.
- **Domínio compartilhado** — `shared/connect_domain.json` → Flutter via `npm run sync:shared`

## Rodar (portal + API)

```bash
cd acaf-partner
npm install
npm run dev
```

- Portal: [http://127.0.0.1:5176](http://127.0.0.1:5176)  
- API: [http://127.0.0.1:8787](http://127.0.0.1:8787) (proxy Vite em `/api`)

Persistência mock: `server/data/store.json` (gitignored).

## Sincronizar domínio com Flutter

```bash
npm run sync:shared
```

Copia `shared/connect_domain.json` para `../acaf-app/assets/shared/connect_domain.json`.

No app associado, opcional em debug:

```dart
GymPortalApi.baseUrl = 'http://127.0.0.1:8787';
```

Ao comprar diária, o app registra o código na API (`POST /api/check-ins/issue`) para a recepção validar.

## API (resumo)

| Método | Rota | Uso |
|--------|------|-----|
| GET | `/api/domain` | Planos + catálogo (shared) |
| GET | `/api/portal` | Estado do painel |
| PATCH | `/api/portal/active-unit` | Unidade ativa |
| PATCH | `/api/units/:id` | Salvar unidade (incl. fotos base64) |
| GET | `/api/units/:id/public` | Flutter — dados públicos da unidade |
| POST | `/api/check-ins/validate` | Recepção |
| POST | `/api/check-ins/issue` | App — registrar QR diária |

## Stack

Vite + React + Hono (Node) + TypeScript.
