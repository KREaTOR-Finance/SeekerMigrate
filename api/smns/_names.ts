const ALLOWED_TLDS = new Set(['sm', 'skr', 'seeker', 'seismic']);

export type SmnsTld = 'sm' | 'skr' | 'seeker' | 'seismic';

export type ParsedName = {
  label: string;
  tld: SmnsTld;
  displayName: string;
  canonicalName: string; // *.sm
  canonicalLabel: string; // label part of canonical
  mirrorName: string; // *.seekermigrate.sol
};

function normalizeTld(input: string | undefined): SmnsTld {
  const raw = (input ?? 'sm').trim().toLowerCase().replace(/^\./, '');
  return (ALLOWED_TLDS.has(raw) ? raw : 'sm') as SmnsTld;
}

function normalizeLabel(input: string) {
  return input.trim().toLowerCase();
}

export function parseSmnsName(inputName: string, rawTld?: string): ParsedName | null {
  const normalized = normalizeLabel(inputName);
  if (!normalized) return null;

  const parts = normalized.split('.');
  const label = parts[0];
  const inferredTld = parts[1];
  const tld = normalizeTld(inferredTld ?? rawTld);

  if (label.length < 2) return null;

  // Canonical SMNS name is always under `.sm`
  const canonicalLabel = tld === 'sm' ? label : `${label}-${tld}`;
  const canonicalName = `${canonicalLabel}.sm`;

  const displayName = `${label}.${tld}`;
  const mirrorName = `${canonicalLabel}.seekermigrate.sol`;

  return { label, tld, displayName, canonicalName, canonicalLabel, mirrorName };
}
