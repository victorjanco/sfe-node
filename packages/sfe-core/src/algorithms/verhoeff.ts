/**
 * Verhoeff — dígito verificador.
 * Port fiel de app/Libraries/Impuestos/Verhoeff.php (PHP) a TypeScript.
 */

export const D: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

export const P: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export const INV: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

function assertNumber(num: string): void {
  if (!/^[0-9]+$/.test(num)) {
    throw new Error(`Error! Value is restricted to the number, ${num} is not a number.`);
  }
}

/** calc(num): devuelve 1 dígito verificador para el número dado. */
export function calc(num: string): number {
  assertNumber(num);
  let r = 0;
  const digits = num.split('').reverse();
  for (let n = 0; n < digits.length; n++) {
    const N = Number(digits[n]);
    r = D[r][P[(n + 1) % 8][N]];
  }
  return INV[r];
}

/** check(num): devuelve 0 si el número es válido. */
export function check(num: string): number {
  assertNumber(num);
  let r = 0;
  const digits = num.split('').reverse();
  for (let n = 0; n < digits.length; n++) {
    const N = Number(digits[n]);
    r = D[r][P[n % 8][N]];
  }
  return r;
}

/** generate(num): num + dígito verificador. */
export function generate(num: string): string {
  return `${num}${calc(num)}`;
}

/** validate(num): true si el número es válido. */
export function validate(num: string): boolean {
  return check(num) === 0;
}