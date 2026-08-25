/**
 * EnLetras — conversión de número a letras en español.
 * Port fiel de app/Libraries/Impuestos/EnLetras.php (PHP) a TypeScript.
 */

const SP = ' ';
const VOID = '';
const ZERO = '0';

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Tabla de palabras (Parte). */
function wordTable(x: number): string {
  switch (x) {
    case 0:
      return 'Cero';
    case 1:
      return 'Un';
    case 2:
      return 'Dos';
    case 3:
      return 'Tres';
    case 4:
      return 'Cuatro';
    case 5:
      return 'Cinco';
    case 6:
      return 'Seis';
    case 7:
      return 'Siete';
    case 8:
      return 'Ocho';
    case 9:
      return 'Nueve';
    case 10:
      return 'Diez';
    case 20:
      return 'Veinte';
    case 30:
      return 'Treinta';
    case 40:
      return 'Cuarenta';
    case 50:
      return 'Cincuenta';
    case 60:
      return 'Sesenta';
    case 70:
      return 'Setenta';
    case 80:
      return 'Ochenta';
    case 90:
      return 'Noventa';
    case 100:
      return 'Cien';
    case 200:
      return 'Doscientos';
    case 300:
      return 'Trescientos';
    case 400:
      return 'Cuatrocientos';
    case 500:
      return 'Quinientos';
    case 600:
      return 'Seiscientos';
    case 700:
      return 'Setecientos';
    case 800:
      return 'Ochocientos';
    case 900:
      return 'Novecientos';
    case 1000:
      return 'Mil';
    case 1000000:
      return 'Millón';
    default:
      return '';
  }
}

/** Reemplazo posicional de un fragmento (ReplaceStringFrom). */
function replaceStringFrom(text: string, oldWord: string, newWord: string, ptr: number): string {
  return text.slice(0, ptr) + newWord + text.slice(ptr + oldWord.length);
}

/**
 * PHP usa substr/strlen a nivel de BYTES (UTF-8). JS opera en UTF-16, por lo que
 * hay que replicar la semántica de bytes para comparaciones de sufijos ("Millón ",
 * "Millones ") donde "ó" ocupa 2 bytes.
 */
function byteSlice(text: string, start: number, length: number): string {
  const bytes = new TextEncoder().encode(text);
  return new TextDecoder().decode(bytes.slice(start, start + length));
}

/** Parte(x) — palabra base con sufijo de escala ("" | " Mil" | " Millones" | " Billones"). */
function parte(x: number): string {
  let t = '';
  let i = 0;
  do {
    t = wordTable(x);
    if (t === VOID) {
      i = i + 1;
      x = x / 1000;
      if (x === 0) i = 0;
    } else {
      break;
    }
  } while (i !== 0);

  const rtn = t;
  switch (i) {
    case 0:
      t = VOID;
      break;
    case 1:
      t = ' Mil';
      break;
    case 2:
      t = ' Millones';
      break;
    case 3:
      t = ' Billones';
      break;
  }
  return rtn + t;
}

/** SubValLetra(numero) — construcción + filtros en el mismo orden que PHP. */
function subValLetra(numero: number): string {
  const x = String(numero).trim();
  const n = x.length;
  let i = n;
  let rtn = '';
  let tem = '';

  while (i > 0) {
    tem = parte(Number(x.charAt(n - i) + ZERO.repeat(i - 1)));
    if (tem !== 'Cero') rtn += tem + SP;
    i = i - 1;
  }

  // -------- GoSub FiltroMil --------
  rtn = rtn.split(' Mil Mil').join(' Un Mil');
  while (true) {
    const ptr = rtn.indexOf('Mil ');
    if (ptr === -1) break;
    if (rtn.indexOf('Mil ', ptr + 1) !== -1) {
      rtn = replaceStringFrom(rtn, 'Mil ', '', ptr);
    } else {
      break;
    }
  }

  // -------- GoSub FiltroCiento --------
  let ptr = -1;
  do {
    ptr = rtn.indexOf('Cien ', ptr + 1);
    if (ptr !== -1) {
      const ch = rtn.charAt(ptr + 5);
      if (ch !== 'M' && ch !== VOID) {
        rtn = replaceStringFrom(rtn, 'Cien', 'Ciento', ptr);
      }
    }
  } while (ptr !== -1);

  // -------- FiltroEspeciales --------
  rtn = rtn.split('Diez Un').join('Once');
  rtn = rtn.split('Diez Dos').join('Doce');
  rtn = rtn.split('Diez Tres').join('Trece');
  rtn = rtn.split('Diez Cuatro').join('Catorce');
  rtn = rtn.split('Diez Cinco').join('Quince');
  rtn = rtn.split('Diez Seis').join('Dieciseis');
  rtn = rtn.split('Diez Siete').join('Diecisiete');
  rtn = rtn.split('Diez Ocho').join('Dieciocho');
  rtn = rtn.split('Diez Nueve').join('Diecinueve');
  rtn = rtn.split('Veinte Un').join('Veintiun');
  rtn = rtn.split('Veinte Dos').join('Veintidos');
  rtn = rtn.split('Veinte Tres').join('Veintitres');
  rtn = rtn.split('Veinte Cuatro').join('Veinticuatro');
  rtn = rtn.split('Veinte Cinco').join('Veinticinco');
  rtn = rtn.split('Veinte Seis').join('Veintiseis');
  rtn = rtn.split('Veinte Siete').join('Veintisiete');
  rtn = rtn.split('Veinte Ocho').join('Veintiocho');
  rtn = rtn.split('Veinte Nueve').join('Veintinueve');

  // -------- FiltroUn --------
  if (rtn.charAt(0) === 'M') rtn = 'Un ' + rtn;

  // -------- Adicionar Y (A..X excepto M=77) --------
  for (let i = 65; i <= 88; i++) {
    if (i !== 77) {
      const c = String.fromCharCode(i);
      rtn = rtn.split('a ' + c).join('* y ' + c);
    }
  }
  rtn = rtn.split('*').join('a');

  return rtn;
}

/** ValorEnLetras(x, Moneda) — número a letras con fracción "/100" y moneda. */
export function valorEnLetras(x: number, moneda: string): string {
  let s = '';
  let ent = '';
  let frc = '';
  let signo = '';

  if (Number(x) < 0) {
    signo = 'Menos ';
  } else {
    signo = '';
  }

  // number_format($x, 2, '.', '') → toFixed(2)
  s = x.toFixed(2);

  const pto = s.indexOf('.');
  if (pto === -1) {
    ent = s;
    frc = VOID;
  } else {
    ent = s.slice(0, pto);
    frc = s.slice(pto + 1);
  }

  if (ent === ZERO || ent === VOID) {
    s = 'Cero ';
  } else if (ent.length > 7) {
    s =
      subValLetra(Number(ent.slice(0, ent.length - 6))) +
      'Millones ' +
      subValLetra(Number(ent.slice(ent.length - 6)));
  } else {
    s = String(subValLetra(Number(ent)));
  }

  if (byteSlice(s, byteLength(s) - 9, 9) === 'Millones ' || byteSlice(s, byteLength(s) - 7, 7) === 'Millón ') {
    s = s + 'de ';
  }

  if (frc !== VOID) {
    s = s + ' ' + frc + '/100 ' + moneda;
  }

  return signo + s;
}