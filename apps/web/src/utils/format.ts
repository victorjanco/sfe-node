// utils/formatDate.ts
const TZ = 'America/La_Paz';

export const formatDateBO = (iso: string): string =>
    new Date(iso).toLocaleString('es-BO', {
        timeZone: TZ,          // ← la clave: SIEMPRE Bolivia
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
// "21/09/2026, 16:05:11" ✅ sin importar dónde esté el usuario

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

export function formatDateTimeStamp(input: string | null | undefined): string {
  if (!input) return '-';

  const match = input.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/
  );

  if (!match) return input;

  const [, year, month, day, hour, minute] = match;

  return `${day}/${month}/${year} ${hour}:${minute}`;
}
