# Domínio compartilhado ACAF Connect

`connect_domain.json` é a **fonte única** para:

- tiers Connect (ids alinhados ao app Flutter `lib/data/connect_plans.dart`)
- catálogo de modalidades
- constantes (taxa de diária, padrões de código de check-in)

## Consumo

| Projeto | Caminho |
|---------|---------|
| Portal academia | `server/` lê na inicialização; front importa via API |
| App associado | `acaf/assets/shared/connect_domain.json` (copiar ou `npm run sync:shared`) |

## Sincronizar para o Flutter

Na raiz de `acaf_gym`:

```bash
npm run sync:shared
```

Copia o JSON para `../acaf/assets/shared/connect_domain.json`.
