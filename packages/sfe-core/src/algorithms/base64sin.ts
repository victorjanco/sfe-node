/**
 * Base64SIN — codificación base-64 del SIN (diccionario 0-9A-Za-z+/).
 * Port fiel de app/Libraries/Impuestos/Base64SIN.php (PHP) a TypeScript.
 */

const DICTIONARY = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
  'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
  'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
  'y', 'z', '+', '/',
];

export function base64SIN(value: number): string {
  let quotient = 1;
  let word = '';
  let v = value;
  while (quotient > 0) {
    quotient = Math.floor(v / 64);
    const remainder = v % 64;
    word = DICTIONARY[remainder] + word;
    v = quotient;
  }
  return word;
}