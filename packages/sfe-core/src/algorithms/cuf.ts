/**
 * CUF — Código Único de Facturación (módulo 11 + base16).
 * Port fiel de app/Services/GenerarCuf.php (PHP) a TypeScript (BigInt reemplaza BCMath).
 */

export interface CufParams {
  nit_emisor: string | number;
  fecha: string; // 'Y-m-dTH:i:s.461' — se eliminan los no dígitos
  sucursal: string | number;
  modalidad: string | number;
  tipo_emision: string | number;
  tipo_factura: string | number;
  documento_sector: string | number;
  numero_factura_format: string; // invoice_num rellenado a 10 dígitos
  punto_venta: string | number;
  codigoControl: string; // código de control del CUFD (viene del SOAP)
}

export interface CufResult {
  numero_base11: string;
  digito_modulo11: string;
  base11: string;
  base16: string;
  cuf: string;
}

/** Rellena con ceros a la izquierda hasta `limite` caracteres (rellenar). */
export function rellenar(dato: string | number, limite: number): string {
  const s = String(dato);
  const diff = limite - s.length;
  return diff > 0 ? ZERO.repeat(diff) + s : s;
}

const ZERO = '0';

/** Convierte a base 16 (convertir_base16) usando BigInt en vez de BCMath. */
export function convertirBase16(number: bigint): string {
  const hexvalues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
  let hexval = '';
  let n = number;
  while (n !== 0n) {
    hexval = hexvalues[Number(n % 16n)] + hexval;
    n = n / 16n;
  }
  return hexval;
}

/** Dígito módulo 11 (calcula_digito_mod11). */
export function calculaDigitoMod11(
  numero: string,
  numero_digitos: number,
  limite_multiplos: number,
  x10: boolean,
): string {
  const countString = numero.length;
  let newNumero = numero;
  for (let n = 1; n <= numero_digitos; n++) {
    let soma = 0;
    let mult = 2;
    for (let i = countString - 1; i >= 0; i--) {
      const numeroExtraido = numero.charAt(i);
      soma += mult * Number(numeroExtraido);
      mult += 1;
      if (mult > limite_multiplos) {
        mult = 2;
      }
    }
    let digito: number;
    if (x10) {
      digito = ((soma * 10) % 11) % 10;
    } else {
      digito = soma % 11;
    }
    if (digito === 10) {
      newNumero += '1';
    } else if (digito === 11) {
      newNumero += '0';
    } else if (digito < 10) {
      newNumero += String(digito);
    }
  }
  return newNumero.slice(newNumero.length - numero_digitos);
}

/** obtener_modulo11($pCadena) — 1 dígito, multiplicadores 2..9. */
export function obtenerModulo11(cadena: string): string {
  return calculaDigitoMod11(cadena, 1, 9, false);
}

/** proceso_cuf($params). */
export function procesoCuf(params: CufParams): CufResult {
  const nitEmisor = rellenar(params.nit_emisor, 13);
  const fecha = params.fecha.replace(/[^0-9]/g, '');
  const sucursal = rellenar(params.sucursal, 4);
  const modalidad = rellenar(params.modalidad, 1);
  const tipoEmision = rellenar(params.tipo_emision, 1);
  const tipoFactura = rellenar(params.tipo_factura, 1);
  const tipoDocumento = rellenar(params.documento_sector, 2);
  const puntoVenta = rellenar(params.punto_venta, 4);

  const numeroBase11 =
    nitEmisor +
    fecha +
    sucursal +
    modalidad +
    tipoEmision +
    tipoFactura +
    tipoDocumento +
    params.numero_factura_format +
    puntoVenta;

  const digitoModulo11 = obtenerModulo11(numeroBase11);
  const base11 = numeroBase11 + digitoModulo11;
  const base16 = convertirBase16(BigInt(base11));
  const cuf = base16 + params.codigoControl;

  return {
    numero_base11: numeroBase11,
    digito_modulo11: digitoModulo11,
    base11,
    base16,
    cuf,
  };
}