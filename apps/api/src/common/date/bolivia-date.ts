import { DateTime } from 'luxon';

/**
 * Zona horaria de negocio (Bolivia).
 * Fuente única de verdad para todo el proyecto.
 */
export const BUSINESS_TZ = 'America/La_Paz';

/**
 * Formato del SIAT para fechas: "yyyy-MM-dd'T'HH:mm:ss.SSS"
 */
const SIAT_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS";

/**
 * Instante "ahora" listo para guardar en Postgres (timestamptz).
 * Es un Date puro, no depende de la zona del servidor.
 */
export const nowDate = (): Date => new Date();

/**
 * "Ahora" como DateTime en zona Bolivia.
 * Úsalo cuando necesites componentes locales (año, mes, día, hora...).
 */
export const nowBolivia = (): DateTime => DateTime.now().setZone(BUSINESS_TZ);

/**
 * "Ahora" en UTC formateado para el SIAT (fechaEnvio).
 */
export const nowSiatEnvio = (): string =>
  DateTime.utc().toFormat(SIAT_FORMAT);

/**
 * "Ahora" en hora Bolivia formateado para el SIAT/XML (fechaEmision, CUF).
 */
export const nowSiatEmision = (): string =>
  DateTime.now().setZone(BUSINESS_TZ).toFormat(SIAT_FORMAT);

/**
 * Convierte cualquier Date/string/DateTime a DateTime en zona Bolivia.
 * - Si es DateTime, solo cambia la zona.
 * - Si es Date, parte del instante.
 * - Si es string ISO (con Z u offset), respeta el instante.
 */
export const toBolivia = (input: Date | string | DateTime): DateTime => {
  if (DateTime.isDateTime(input)) return input.setZone(BUSINESS_TZ);
  if (input instanceof Date) return DateTime.fromJSDate(input).setZone(BUSINESS_TZ);
  return DateTime.fromISO(input, { setZone: true }).setZone(BUSINESS_TZ);
};

/**
 * Formato humano para mostrar al usuario: "2026-09-15 15:17:11"
 */
export const formatBolivia = (input: Date | string | DateTime): string =>
  toBolivia(input).toFormat('yyyy-MM-dd HH:mm:ss');

/**
 * Formato SIAT hora Bolivia: "2026-09-15T15:17:11.950"
 * Se usa para el XML y para el CUF.
 */
export const formatSiatEmision = (input: Date | string | DateTime): string =>
  toBolivia(input).toFormat(SIAT_FORMAT);

/**
 * Formato SIAT con offset: "2026-09-15T15:17:11.950-04:00"
 * Solo si el SIAT lo exige explícitamente.
 */
export const formatSiatEmisionWithOffset = (input: Date | string | DateTime): string =>
  toBolivia(input).toFormat(`${SIAT_FORMAT}ZZ`);

/**
 * Rango [start, end) del día Bolivia, para filtros SQL.
 * fechaISO: "2026-09-15"
 */
export const boliviaDayRange = (fechaISO: string): { start: Date; end: Date } => {
  const startDt = DateTime.fromISO(fechaISO, { zone: BUSINESS_TZ }).startOf('day');
  return {
    start: startDt.toJSDate(),
    end: startDt.plus({ days: 1 }).toJSDate(),
  };
};

/**
 * Parsea un string ISO del frontend respetando su offset.
 * Ej: "2026-09-15T19:17:11.950Z" → Date con el mismo instante.
 */
export const parseIso = (s: string): Date =>
  DateTime.fromISO(s, { setZone: true }).toJSDate();

/**
 * Parsea un string SIN zona interpretándolo como hora Bolivia.
 * Ej: "2026-09-15 15:17:11" → Date (instante correcto en UTC).
 * Úsalo solo para fuentes legacy / SIAT que no traen offset.
 */
export const parseBoliviaLocal = (s: string): Date =>
  DateTime.fromFormat(s, 'yyyy-MM-dd HH:mm:ss', { zone: BUSINESS_TZ }).toJSDate();
