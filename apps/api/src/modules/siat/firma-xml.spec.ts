import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SignedXml } from 'xml-crypto';
import { firmarFacturaXml } from './firma-xml';

const privateKey = readFileSync(
  join(__dirname, '..', '..', '..', 'test', 'fixtures', 'demo.key'),
  'utf8',
);
const certificate = readFileSync(
  join(__dirname, '..', '..', '..', 'test', 'fixtures', 'demo.crt'),
  'utf8',
);

const XML = `<facturaElectronicaCompraVenta xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="facturaElectronicaCompraVenta.xsd"><cabecera><nitEmisor>1020304012</nitEmisor><razonSocialEmisor>FACTURACION IC S.R.L.</razonSocialEmisor></cabecera><detalle><codigoProducto>P0001</codigoProducto><descripcion>ARROZ 1KG</descripcion></detalle></facturaElectronicaCompraVenta>`;

describe('firma-xml (XMLDSig perfil SIAT)', () => {
  it('firma el XML con enveloped-signature + c14n-con-comentarios y sin XAdES/Id', () => {
    const firmado = firmarFacturaXml({ xml: XML, privateKey, certificate });

    expect(firmado).toContain('<ds:Signature');
    expect(firmado).toContain('http://www.w3.org/2001/04/xmldsig-more#rsa-sha256');
    expect(firmado).toContain('http://www.w3.org/2000/09/xmldsig#enveloped-signature');
    expect(firmado).toContain('http://www.w3.org/TR/2001/REC-xml-c14n-20010315#WithComments');
    expect(firmado).not.toContain('xades:QualifyingProperties');
    expect(firmado).not.toContain('Id="SignatureFactura"');
  });

  it('la firma XMLDSig valida con xml-crypto', () => {
    const firmado = firmarFacturaXml({ xml: XML, privateKey, certificate });

    const m = firmado.match(/<ds:Signature[\s\S]*<\/ds:Signature>/);
    expect(m).toBeTruthy();
    const sig = new SignedXml();
    sig.privateKey = privateKey;
    sig.loadSignature(m![0]);
    expect(sig.checkSignature(firmado)).toBe(true);
  });

  it('el certificado y la clave de prueba son coherentes', () => {
    const firmado = firmarFacturaXml({ xml: XML, privateKey, certificate });
    const b64 = certificate.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    expect(firmado).toContain(b64);
  });
});
