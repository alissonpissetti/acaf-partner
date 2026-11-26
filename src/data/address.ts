export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export type UnitAddressForm = {
  zip: string;
  address: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export function formatZip(value: string | undefined | null): string {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function parseLegacyCity(city: string | undefined, state?: string) {
  if (state) {
    return { city: city ?? '', state: state.toUpperCase() };
  }
  const match = String(city ?? '').match(/^(.+?)\/([A-Za-z]{2})$/);
  if (match) {
    return { city: match[1]!.trim(), state: match[2]!.toUpperCase() };
  }
  return { city: city ?? '', state: '' };
}

export function formatUnitLocation(unit: {
  neighborhood?: string;
  city?: string;
  state?: string;
}): string {
  const { city, state } = parseLegacyCity(unit.city, unit.state);
  const cityLabel = state ? `${city}/${state}` : city;
  const parts = [unit.neighborhood, cityLabel].filter(Boolean);
  return parts.join(', ') || '—';
}

export function unitToAddressForm(unit: {
  zip?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}): UnitAddressForm {
  const parsed = parseLegacyCity(unit.city, unit.state);
  return {
    zip: formatZip(unit.zip ?? ''),
    address: unit.address ?? '',
    number: unit.number ?? '',
    complement: unit.complement ?? '',
    neighborhood: unit.neighborhood ?? '',
    city: parsed.city,
    state: parsed.state,
  };
}

export function isAddressComplete(value: Partial<UnitAddressForm> | null | undefined): boolean {
  const zip = String(value?.zip ?? '').replace(/\D/g, '');
  return (
    zip.length === 8 &&
    Boolean(value?.address?.trim()) &&
    Boolean(value?.neighborhood?.trim()) &&
    Boolean(value?.city?.trim()) &&
    Boolean(value?.state?.trim())
  );
}

/** Linhas de endereço no app (rua, complemento, bairro, cidade/UF, CEP). */
export function memberAppAddressLines(unit: {
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
}): string[] {
  const form = unitToAddressForm(unit);
  const lines: string[] = [];
  if (form.address.trim()) {
    let street = form.address.trim();
    if (form.number.trim()) street += `, ${form.number.trim()}`;
    lines.push(street);
  }
  if (form.complement.trim()) lines.push(form.complement.trim());
  if (form.neighborhood.trim()) lines.push(form.neighborhood.trim());
  const cityLabel = form.state ? `${form.city}/${form.state}` : form.city;
  if (cityLabel.trim()) lines.push(cityLabel.trim());
  const cep = formatZip(form.zip);
  if (cep.replace(/\D/g, '').length >= 8) lines.push(`CEP ${cep}`);
  return lines;
}

export function memberAppAddressPreviewLine(unit: Parameters<typeof memberAppAddressLines>[0]): string {
  const lines = memberAppAddressLines(unit);
  if (lines.length) return lines[0]!;
  return formatUnitLocation(unit);
}

export function formatAddressSummary(value: Partial<UnitAddressForm> | null | undefined): string {
  const parts: string[] = [];
  if (value?.address?.trim()) {
    let line = value.address.trim();
    if (value.number?.trim()) line += `, ${value.number.trim()}`;
    parts.push(line);
  }
  if (value?.complement?.trim()) parts.push(value.complement.trim());
  const cityPart = value?.state ? `${value.city}/${value.state}` : value?.city;
  const locality = [value?.neighborhood, cityPart].filter(Boolean).join(' · ');
  if (locality) parts.push(locality);
  if (value?.zip) parts.push(formatZip(value.zip));
  return parts.join(' — ') || 'Endereço não informado';
}
