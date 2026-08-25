import { describe, expect, it } from 'vitest';
import { Verhoeff } from '../src/index';
import { encryptMessageRC4 } from '../src/algorithms/rc4';
import { base64SIN } from '../src/algorithms/base64sin';
import { generateControlCode } from '../src/algorithms/controlCode';
import { valorEnLetras } from '../src/algorithms/enLetras';
import { procesoCuf, obtenerModulo11 } from '../src/algorithms/cuf';

describe('Verhoeff', () => {
  it('calc genera los mismos dígitos que el PHP original', () => {
    expect(Verhoeff.calc('2755')).toBe(1);
    expect(Verhoeff.calc('2675452')).toBe(3);
    expect(Verhoeff.calc('20080711')).toBe(5);
    expect(Verhoeff.calc('343')).toBe(5);
  });

  it('generate y validate', () => {
    expect(Verhoeff.generate('2755')).toBe('27551');
    expect(Verhoeff.check('27551')).toBe(0);
    expect(Verhoeff.validate('27551')).toBe(true);
  });

  it('rechaza no numéricos', () => {
    expect(() => Verhoeff.calc('abc')).toThrow();
  });
});

describe('AllegedRC4', () => {
  it('coincide con el PHP original (con guiones)', () => {
    expect(encryptMessageRC4('7904002304555275500044', '9rCB7Sv4X29d')).toBe(
      '18-CB-CA-63-11-05-A9-F7-D6-48-5C-C8-BB-1D-E7-8A-36-CE-8D-82-FD-04',
    );
  });

  it('coincide con el PHP original (sin guiones)', () => {
    expect(encryptMessageRC4('7904002304555275500044', '9rCB7Sv4X29d', true)).toBe(
      '18CBCA631105A9F7D6485CC8BB1DE78A36CE8D82FD04',
    );
  });
});

describe('Base64SIN', () => {
  it('coincide con el PHP original', () => {
    expect(base64SIN(0)).toBe('0');
    expect(base64SIN(64)).toBe('10');
    expect(base64SIN(12345)).toBe('30v');
    expect(base64SIN(4096)).toBe('100');
  });
});

describe('Código de Control', () => {
  it('caso 1 (oro del PHP original)', () => {
    expect(generateControlCode('7904002304555', '2755', '2675452', '20080711', '342.5', '9rCB7Sv4X29d')).toBe(
      '20-43-E8-FF',
    );
  });

  it('caso 2', () => {
    expect(generateControlCode('7904002304555', '123', '2675452', '20200101', '1000', '9rCB7Sv4X29d')).toBe(
      '81-7F-07-D8-E2',
    );
  });

  it('caso 3 con llave de caracteres especiales', () => {
    expect(generateControlCode('1234567', '1', '1234567', '20240115', '250.75', 'kG8fV2xQ7c#A')).toBe('3D-F2-72-C3');
  });

  it('acepta coma decimal como el PHP', () => {
    expect(generateControlCode('7904002304555', '2755', '2675452', '20080711', '342,5', '9rCB7Sv4X29d')).toBe(
      '20-43-E8-FF',
    );
  });
});

describe('EnLetras', () => {
  it('coincide con el PHP original (incluido espaciado)', () => {
    expect(valorEnLetras(123.45, 'Bs')).toBe('Ciento Veintitres  45/100 Bs');
    expect(valorEnLetras(1000, 'Bs')).toBe('Un Mil  00/100 Bs');
    expect(valorEnLetras(-123.45, 'Bs')).toBe('Menos Ciento Veintitres  45/100 Bs');
    expect(valorEnLetras(1234567.89, 'Bs')).toBe(
      'Un Millón Doscientos Treinta y Cuatro Mil Quinientos Sesenta y Siete  89/100 Bs',
    );
    expect(valorEnLetras(250.75, 'Bs')).toBe('Doscientos Cincuenta  75/100 Bs');
    expect(valorEnLetras(55, 'Bs')).toBe('Cincuenta y Cinco  00/100 Bs');
    expect(valorEnLetras(100000, 'Bs')).toBe('Cien Mil  00/100 Bs');
    expect(valorEnLetras(0, 'Bs')).toBe('Cero  00/100 Bs');
    expect(valorEnLetras(1000000, 'Bs')).toBe('Un Millón  00/100 Bs');
    expect(valorEnLetras(100000000, 'Bs')).toBe('Cien Millones de  00/100 Bs');
  });
});

describe('CUF', () => {
  it('obtenerModulo11', () => {
    expect(obtenerModulo11('0000000370395025201805011011124610000010001000000100000001')).toBe('7');
  });

  it('proceso_cuf caso 1 (oro del PHP original)', () => {
    const r = procesoCuf({
      nit_emisor: '370395025',
      fecha: '2018-05-01T10:11:12.461',
      sucursal: 0,
      modalidad: 1,
      tipo_emision: 1,
      tipo_factura: 1,
      documento_sector: 1,
      numero_factura_format: '0000000001',
      punto_venta: 0,
      codigoControl: '0ECE9C96',
    });
    expect(r.numero_base11).toBe('00003703950252018050110111246100001110100000000010000');
    expect(r.digito_modulo11).toBe('8');
    expect(r.base11).toBe('000037039502520180501101112461000011101000000000100008');
    expect(r.base16).toBe('1957ECBC6C59A378983B2066A4B22ADA7CE09E06A8');
    expect(r.cuf).toBe('1957ECBC6C59A378983B2066A4B22ADA7CE09E06A80ECE9C96');
  });

  it('proceso_cuf caso 2 (oro del PHP original)', () => {
    const r = procesoCuf({
      nit_emisor: '2947679018',
      fecha: '2020-11-05T15:20:33.461',
      sucursal: 0,
      modalidad: 2,
      tipo_emision: 1,
      tipo_factura: 1,
      documento_sector: 1,
      numero_factura_format: '0000000245',
      punto_venta: 0,
      codigoControl: '101301DBCEC4C',
    });
    expect(r.numero_base11).toBe('00029476790182020110515203346100002110100000002450000');
    expect(r.digito_modulo11).toBe('5');
    expect(r.base16).toBe('C9B039DC6376733E2F16D67F8F7514C33893FA5725');
    expect(r.cuf).toBe('C9B039DC6376733E2F16D67F8F7514C33893FA5725101301DBCEC4C');
  });
});