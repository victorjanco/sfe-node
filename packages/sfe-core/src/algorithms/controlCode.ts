/**
 * Código de Control (algoritmo SIN v2) en 6 pasos.
 * Port fiel de app/Libraries/Impuestos/ControlCode.php (PHP) a TypeScript.
 * Orquesta Verhoeff + AllegedRC4 + Base64SIN.
 */
import { calc as verhoeffCalc } from './verhoeff';
import { encryptMessageRC4 } from './rc4';
import { base64SIN } from './base64sin';

function validateNumber(value: string): void {
  if (!/^[0-9,.]+$/.test(value)) {
    throw new Error(`Error! Valor restringido a número, ${value} no es un número.`);
  }
}

function validateDosageKey(value: string): void {
  if (!/^[A-Za-z0-9=#()*+_\@\[\]{}%$]+$/.test(value)) {
    throw new Error(`Error! llave de dosificación, ${value} contiene caracteres NO permitidos.`);
  }
}

/** Redondea medio hacia arriba (PHP_ROUND_HALF_UP). */
function roundHalfUp(x: number): number {
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

/** round($value, 0, PHP_ROUND_HALF_UP): "123", "123.4", "123,4" → número entero. */
function roundUp(value: string): number {
  const value2 = value.replace(/,/g, '.');
  return roundHalfUp(Number(value2));
}

/** Añade N dígitos Verhoeff a una cadena (addVerhoeffDigit). */
function addVerhoeffDigit(value: string | number, max: number): string {
  let v = String(value);
  for (let i = 1; i <= max; i++) {
    v += String(verhoeffCalc(v));
  }
  return v;
}

/**
 * @param authorizationNumber Número de autorización
 * @param invoiceNumber Número de factura
 * @param nitci NIT o Carnet de Identidad
 * @param dateOfTransaction fecha AAAAMMDD
 * @param transactionAmount monto ("123", "123.4", "123,4")
 * @param dosageKey llave de dosificación
 */
export function generateControlCode(
  authorizationNumber: string,
  invoiceNumber: string,
  nitci: string,
  dateOfTransaction: string,
  transactionAmount: string,
  dosageKey: string,
): string {
  if (
    !authorizationNumber ||
    !invoiceNumber ||
    !dateOfTransaction ||
    !transactionAmount ||
    !dosageKey ||
    !(nitci.length > 0)
  ) {
    throw new Error('<b>Todos los campos son obligatorios</b>');
  }
  validateNumber(authorizationNumber);
  validateNumber(invoiceNumber);
  validateNumber(dateOfTransaction);
  validateNumber(nitci);
  validateNumber(transactionAmount);
  validateDosageKey(dosageKey);

  let amount = String(roundUp(transactionAmount));

  /* ========== PASO 1 ============= */
  let invoice = addVerhoeffDigit(invoiceNumber, 2);
  let nit = addVerhoeffDigit(nitci, 2);
  let date = addVerhoeffDigit(dateOfTransaction, 2);
  amount = addVerhoeffDigit(amount, 2);

  // suma NUMÉRICA (no concatenación)
  const sumOfVariables = Number(invoice) + Number(nit) + Number(date) + Number(amount);
  const sumOfVariables5Verhoeff = addVerhoeffDigit(String(sumOfVariables), 5);

  /* ========== PASO 2 ============= */
  const fiveDigitsVerhoeff = sumOfVariables5Verhoeff.slice(sumOfVariables5Verhoeff.length - 5);
  const numbers = fiveDigitsVerhoeff.split('').map((c) => Number(c) + 1);

  const string1 = dosageKey.substr(0, numbers[0]);
  const string2 = dosageKey.substr(numbers[0], numbers[1]);
  const string3 = dosageKey.substr(numbers[0] + numbers[1], numbers[2]);
  const string4 = dosageKey.substr(numbers[0] + numbers[1] + numbers[2], numbers[3]);
  const string5 = dosageKey.substr(numbers[0] + numbers[1] + numbers[2] + numbers[3], numbers[4]);

  const authorizationNumberDKey = authorizationNumber + string1;
  const invoiceNumberdKey = invoice + string2;
  const NITCIDKey = nit + string3;
  const dateOfTransactionDKey = date + string4;
  const transactionAmountDKey = amount + string5;

  /* ========== PASO 3 ============= */
  const stringDKey =
    authorizationNumberDKey + invoiceNumberdKey + NITCIDKey + dateOfTransactionDKey + transactionAmountDKey;
  const keyForEncryption = dosageKey + fiveDigitsVerhoeff;
  const allegedRC4String = encryptMessageRC4(stringDKey, keyForEncryption, true);

  /* ========== PASO 4 ============= */
  let totalAmount = 0;
  let sp1 = 0;
  let sp2 = 0;
  let sp3 = 0;
  let sp4 = 0;
  let sp5 = 0;
  let tmp = 1;
  for (let i = 0; i < allegedRC4String.length; i++) {
    const code = allegedRC4String.charCodeAt(i);
    totalAmount += code;
    switch (tmp) {
      case 1:
        sp1 += code;
        break;
      case 2:
        sp2 += code;
        break;
      case 3:
        sp3 += code;
        break;
      case 4:
        sp4 += code;
        break;
      case 5:
        sp5 += code;
        break;
    }
    tmp = tmp < 5 ? tmp + 1 : 1;
  }

  /* ========== PASO 5 ============= */
  const tmp1 = Math.floor((totalAmount * sp1) / numbers[0]);
  const tmp2 = Math.floor((totalAmount * sp2) / numbers[1]);
  const tmp3 = Math.floor((totalAmount * sp3) / numbers[2]);
  const tmp4 = Math.floor((totalAmount * sp4) / numbers[3]);
  const tmp5 = Math.floor((totalAmount * sp5) / numbers[4]);
  const sumProduct = tmp1 + tmp2 + tmp3 + tmp4 + tmp5;
  const encoded = base64SIN(sumProduct);

  /* ========== PASO 6 ============= */
  return encryptMessageRC4(encoded, dosageKey + fiveDigitsVerhoeff);
}