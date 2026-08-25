import { SignedXml } from 'xml-crypto';

/**
 * Firma digital XMLDSig (perfil SIAT) para Factura Electrónica / Computarizada en Línea.
 *
 * Replica el esquema del sistema original (XMLSecurityDSig / PHP):
 *  - enveloped-signature + c14n-with-comments como transforms de la referencia
 *  - rsa-sha256 sobre SignedInfo canonizado con c14n
 *  - X509Data con el certificado en KeyInfo
 *  - sin atributo Id en <ds:Signature> ni bloque XAdES (el XSD del SIAT lo rechaza)
 */

export interface FirmaXmlParams {
  xml: string;
  privateKey: string;
  certificate: string;
}

export function firmarFacturaXml(params: FirmaXmlParams): string {
  const sig = new SignedXml();

  sig.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
  sig.canonicalizationAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
  sig.addReference({
    xpath: '/*',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315#WithComments',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    uri: '',
    inclusiveNamespacesPrefixList: [],
    isEmptyUri: true,
  });
  sig.privateKey = params.privateKey;
  sig.publicCert = params.certificate;

  sig.computeSignature(params.xml, {
    prefix: 'ds',
    location: { reference: '/*', action: 'append' },
    existingPrefixes: { ds: 'http://www.w3.org/2000/09/xmldsig#' },
  });

  return sig.getSignedXml();
}
