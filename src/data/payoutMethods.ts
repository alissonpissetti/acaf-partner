export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'evp';

export type PayoutMethod = {
  id: string;
  type: 'pix';
  pixKeyType: PixKeyType;
  pixKey: string;
  holderName: string;
  isDefault?: boolean;
  createdAt: string;
};

const STORAGE_KEY = 'acaf_partner_payout_methods_v2';

type LegacyPayoutMethod = {
  id: string;
  type: 'pix';
  pixKeyType?: PixKeyType;
  pixKey?: string;
  pixKeyMasked?: string;
  holderLabel?: string;
  holderName?: string;
};

function migrateLegacy(raw: LegacyPayoutMethod[]): PayoutMethod[] {
  return raw.map((item) => ({
    id: item.id,
    type: 'pix' as const,
    pixKeyType: item.pixKeyType ?? 'cpf',
    pixKey: item.pixKey ?? legacyMaskedToPlaceholder(item.pixKeyMasked),
    holderName: item.holderName ?? item.holderLabel ?? 'Titular',
    createdAt: new Date().toISOString(),
  }));
}

function legacyMaskedToPlaceholder(masked?: string): string {
  const tail = masked?.replace(/\D/g, '').slice(-4);
  return tail ? `000000000${tail}`.slice(-11) : '00000000000';
}

export function loadPayoutMethods(): PayoutMethod[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PayoutMethod[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return ensureDefault(parsed);
      }
    }
    const legacyRaw = localStorage.getItem('acaf_partner_payout_methods');
    if (legacyRaw) {
      const migrated = migrateLegacy(JSON.parse(legacyRaw) as LegacyPayoutMethod[]);
      if (migrated.length > 0) {
        savePayoutMethods(migrated);
        return migrated;
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

function ensureDefault(methods: PayoutMethod[]): PayoutMethod[] {
  if (methods.some((m) => m.isDefault)) return methods;
  if (methods.length === 0) return methods;
  return methods.map((m, i) => (i === 0 ? { ...m, isDefault: true } : m));
}

export function savePayoutMethods(methods: PayoutMethod[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ensureDefault(methods)));
}

export function pixKeyTypeLabel(type: PixKeyType): string {
  switch (type) {
    case 'cpf':
      return 'CPF';
    case 'cnpj':
      return 'CNPJ';
    case 'email':
      return 'E-mail';
    case 'phone':
      return 'Telefone';
    case 'evp':
      return 'Aleatória';
    default:
      return type;
  }
}

export function maskPixKeyForDisplay(key: string, keyType: PixKeyType): string {
  const k = key.trim();
  if (!k) return '—';
  if (keyType === 'email') {
    const at = k.indexOf('@');
    if (at <= 0) return '***';
    const user = k.slice(0, at);
    const domain = k.slice(at + 1);
    const u =
      user.length <= 2
        ? '**'
        : `${user[0]}${'•'.repeat(Math.min(4, user.length - 2))}${user[user.length - 1]}`;
    return `${u}@${domain}`;
  }
  if (k.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(6, k.length - 4))}${k.slice(-4)}`;
}

export function payoutMethodSummary(method: PayoutMethod): string {
  const label = pixKeyTypeLabel(method.pixKeyType);
  const keyDisp = maskPixKeyForDisplay(method.pixKey, method.pixKeyType);
  return `Pix (${label}) · ${keyDisp} · ${method.holderName}`;
}

export function normalizePixKeyInput(type: PixKeyType, raw: string): string {
  const value = raw.trim();
  if (type === 'email' || type === 'evp') return value;
  if (type === 'phone') return value.replace(/\D/g, '');
  return value.replace(/\D/g, '');
}

export function validatePixKey(type: PixKeyType, key: string): string | null {
  const normalized = normalizePixKeyInput(type, key);
  if (!normalized) return 'Informe a chave Pix.';

  if (type === 'cpf' && normalized.length !== 11) {
    return 'CPF deve ter 11 dígitos.';
  }
  if (type === 'cnpj' && normalized.length !== 14) {
    return 'CNPJ deve ter 14 dígitos.';
  }
  if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return 'E-mail inválido.';
  }
  if (type === 'phone' && (normalized.length < 10 || normalized.length > 11)) {
    return 'Telefone deve ter 10 ou 11 dígitos (com DDD).';
  }
  if (type === 'evp' && normalized.replace(/-/g, '').length < 32) {
    return 'Chave aleatória inválida.';
  }
  return null;
}

export function createPayoutMethod(input: {
  pixKeyType: PixKeyType;
  pixKey: string;
  holderName: string;
  isDefault?: boolean;
}): PayoutMethod {
  return {
    id: `pix-${crypto.randomUUID()}`,
    type: 'pix',
    pixKeyType: input.pixKeyType,
    pixKey: normalizePixKeyInput(input.pixKeyType, input.pixKey),
    holderName: input.holderName.trim(),
    isDefault: input.isDefault,
    createdAt: new Date().toISOString(),
  };
}

export function addPayoutMethod(
  methods: PayoutMethod[],
  input: { pixKeyType: PixKeyType; pixKey: string; holderName: string; isDefault?: boolean },
): PayoutMethod[] {
  const next = createPayoutMethod(input);
  let list = [...methods, next];
  if (input.isDefault || methods.length === 0) {
    list = list.map((m) => ({ ...m, isDefault: m.id === next.id }));
  }
  savePayoutMethods(list);
  return list;
}

export function updatePayoutMethod(
  methods: PayoutMethod[],
  id: string,
  patch: Partial<Pick<PayoutMethod, 'pixKeyType' | 'pixKey' | 'holderName' | 'isDefault'>>,
): PayoutMethod[] {
  let list = methods.map((m) => {
    if (m.id !== id) return m;
    const pixKeyType = patch.pixKeyType ?? m.pixKeyType;
    return {
      ...m,
      ...patch,
      pixKeyType,
      pixKey: patch.pixKey != null ? normalizePixKeyInput(pixKeyType, patch.pixKey) : m.pixKey,
      holderName: patch.holderName?.trim() ?? m.holderName,
    };
  });
  if (patch.isDefault) {
    list = list.map((m) => ({ ...m, isDefault: m.id === id }));
  }
  savePayoutMethods(list);
  return list;
}

export function removePayoutMethod(methods: PayoutMethod[], id: string): PayoutMethod[] {
  const list = methods.filter((m) => m.id !== id);
  if (list.length > 0 && !list.some((m) => m.isDefault)) {
    list[0] = { ...list[0], isDefault: true };
  }
  savePayoutMethods(list);
  return list;
}

export function defaultPayoutMethod(methods: PayoutMethod[]): PayoutMethod | undefined {
  return methods.find((m) => m.isDefault) ?? methods[0];
}
