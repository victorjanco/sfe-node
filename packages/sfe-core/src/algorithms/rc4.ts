/**
 * AllegedRC4 — cifrado RC4 del SIN con salida hexadecimal.
 * Port fiel de app/Libraries/Impuestos/AllegedRC4.php (PHP) a TypeScript.
 */

/**
 * @param message mensaje a encriptar
 * @param key llave para encriptar
 * @param unscripted sin guiones TRUE|FALSE
 * @returns mensaje encriptado en hexadecimal (mayúsculas)
 */
export function encryptMessageRC4(message: string, key: string, unscripted = false): string {
  const state = Array.from({ length: 256 }, (_, i) => i);
  const messageBuf = Array.from(message, (c) => c.charCodeAt(0) & 0xff);
  const keyBuf = Array.from(key, (c) => c.charCodeAt(0) & 0xff);

  let x = 0;
  let y = 0;
  let index1 = 0;
  let index2 = 0;

  for (let i = 0; i <= 255; i++) {
    index2 = (keyBuf[index1] + state[i] + index2) % 256;
    const aux = state[i];
    state[i] = state[index2];
    state[index2] = aux;
    index1 = (index1 + 1) % keyBuf.length;
  }

  let messageEncryption = '';
  for (let i = 0; i < messageBuf.length; i++) {
    x = (x + 1) % 256;
    y = (state[x] + y) % 256;
    const aux = state[x];
    state[x] = state[y];
    state[y] = aux;
    const nmen = messageBuf[i] ^ state[(state[x] + state[y]) % 256];
    const hex = nmen.toString(16).toUpperCase().padStart(2, '0');
    messageEncryption += (unscripted ? '' : '-') + hex;
  }

  // PHP devuelve `false` para mensaje vacío con guiones (substr("",1)); aquí devolvemos "".
  return unscripted ? messageEncryption : messageEncryption.slice(1);
}