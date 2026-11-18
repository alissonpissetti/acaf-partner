# Domínio compartilhado (planos e taxas)

`connect_domain.json` é a **fonte única** para:

- tiers de planos (ids alinhados ao app Flutter `lib/data/connect_plans.dart`)
- catálogo de modalidades
- constantes (taxa de diária, padrões de código de check-in)
- `checkInGeo.maxRadiusKm` — **valor inicial**; em runtime a API usa `acaf_system_settings.checkInMaxRadiusKm` (Sistema → Configurações no admin). Valor **0** desativa validação por distância (apenas para homologação/testes).

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
