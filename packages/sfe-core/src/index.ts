import {
  calc as verhoeffCalc,
  check as verhoeffCheck,
  generate as verhoeffGenerate,
  validate as verhoeffValidate,
} from './algorithms/verhoeff';
import { encryptMessageRC4 as rc4Encrypt } from './algorithms/rc4';
import { base64SIN as encodeBase64 } from './algorithms/base64sin';
import { generateControlCode as generateControlCodeImpl } from './algorithms/controlCode';
import { valorEnLetras as numberToWords } from './algorithms/enLetras';
import {
  procesoCuf as procesoCufImpl,
  obtenerModulo11 as modulo11Impl,
  calculaDigitoMod11 as calcDigitoMod11,
  rellenar as rellenarImpl,
  convertirBase16 as toBase16,
} from './algorithms/cuf';
import type { CufParams, CufResult } from './algorithms/cuf';

// NOTA: se usan asignaciones directas (no `export { x } from`) para que el CJS
// compile a `exports.x = ...` y Rollup/Vite pueda detectar los exports estáticamente.

export const Verhoeff = {
  calc: verhoeffCalc,
  check: verhoeffCheck,
  generate: verhoeffGenerate,
  validate: verhoeffValidate,
};

export const encryptMessageRC4 = rc4Encrypt;
export const base64SIN = encodeBase64;
export const generateControlCode = generateControlCodeImpl;
export const valorEnLetras = numberToWords;
export const procesoCuf = procesoCufImpl;
export const obtenerModulo11 = modulo11Impl;
export const calculaDigitoMod11 = calcDigitoMod11;
export const rellenar = rellenarImpl;
export const convertirBase16 = toBase16;

export type { CufParams, CufResult };