export function factor(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function roundFormat(value: number | string, decimals: number): number {
  const n = factor(value);
  const p = Math.pow(10, decimals);
  return Math.round((n + Number.EPSILON) * p) / p;
}

export function formatNumber(value: number | string, decimals = 2): string {
  return factor(value).toFixed(decimals);
}

export function nowLocalDatetime(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function formatDate(input: string | null | undefined): string {
  if (!input) return '-';
  const d = new Date(input);
  if (isNaN(d.getTime())) return input;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}