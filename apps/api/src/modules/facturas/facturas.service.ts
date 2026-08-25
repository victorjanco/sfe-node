import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { renderFacturaHtml } from './templates/ticket-factura';
import { renderFacturaCartaHtml } from './templates/carta-factura';
import { renderNotaVentaRolloHtml } from './templates/nota-rollo';
import { renderNotaVentaCartaHtml } from './templates/nota-carta';
import * as QRCode from 'qrcode';
import * as puppeteer from 'puppeteer-core';
import { existsSync } from 'fs';

const PRODUCCION = 1;
const ROLLO = 1;
const MEDIA_HOJA = 2;

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

function findExecutablePath(): string | undefined {
  return CHROME_PATHS.find((p) => existsSync(p));
}

@Injectable()
export class FacturasService {
  constructor(private readonly prisma: PrismaService) {}

  async generarPdf(id: number, printType?: string): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        invoiceDetails: true,
        branchOffice: { include: { company: true } },
        pointSale: true,
        user: true,
      },
    });
    if (!invoice) throw new NotFoundException(`Factura con id ${id} no encontrada`);
    if (!invoice.branchOffice?.company) {
      throw new NotFoundException('Empresa no configurada para la sucursal de la factura');
    }

    const company = invoice.branchOffice.company;
    const typePrint =
      printType === 'carta' || printType === 'media_hoja'
        ? MEDIA_HOJA
        : printType === 'rollo'
          ? ROLLO
          : company.typePrint === ROLLO
            ? ROLLO
            : MEDIA_HOJA;
    const qrUrl =
      (company.environmentCode === PRODUCCION
        ? 'https://siat.impuestos.gob.bo/consulta/QR'
        : 'https://pilotosiat.impuestos.gob.bo/consulta/QR') +
      `?nit=${invoice.branchOffice.nit}&cuf=${invoice.cuf ?? ''}&numero=${invoice.invoiceNum}&t=${typePrint}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 130, margin: 0 });

    const unitMeasureIds = [...new Set(invoice.invoiceDetails.map((d) => d.unitMeasureId))];
    const unitMeasures = await this.prisma.unitMeasure.findMany({
      where: { id: { in: unitMeasureIds } },
    });
    const unitMeasureMap = new Map(unitMeasures.map((u) => [u.id, u.description]));

    const html =
      typePrint === ROLLO
        ? renderFacturaHtml({
            company: { name: company.name },
            branchOffice: {
              code: invoice.branchOffice.code,
              city: invoice.branchOffice.city,
              nit: invoice.branchOffice.nit,
            },
            invoice: {
              invoiceNum: invoice.invoiceNum,
              cuf: invoice.cuf ?? '',
              codeCustomer: invoice.codeCustomer,
              nitCustomer: invoice.nitCustomer,
              customerName: invoice.customerName,
              invoiceDateFormat: invoice.invoiceDateFormat ?? invoice.invoiceDate,
              subtotal: invoice.subtotal,
              discount: invoice.discount,
              total: invoice.total,
              giftCardAmount: invoice.giftCardAmount,
              totalToPay: invoice.totalToPay,
              legendDescription: invoice.legendDescription,
              emissionType: invoice.emissionType,
              address: invoice.address,
              pointSaleCode: invoice.pointSale?.pointSaleCode ?? invoice.pointSaleCode ?? 0,
            },
            details: invoice.invoiceDetails.map((d) => ({
              productCode: d.productCode,
              description: d.description,
              unitMeasure: unitMeasureMap.get(d.unitMeasureId) ?? null,
              amount: d.amount,
              sellingPrice: d.sellingPrice,
              discount: d.discount,
              subtotal: d.subtotal,
            })),
            user: invoice.user ? { username: invoice.user.username } : null,
            qrDataUrl,
          })
        : renderFacturaCartaHtml({
            company: { name: company.name },
            branchOffice: {
              code: invoice.branchOffice.code,
              city: invoice.branchOffice.city,
              nit: invoice.branchOffice.nit,
            },
            invoice: {
              invoiceNum: invoice.invoiceNum,
              cuf: invoice.cuf ?? '',
              codeCustomer: invoice.codeCustomer,
              nitCustomer: invoice.nitCustomer,
              customerName: invoice.customerName,
              invoiceDateFormat: invoice.invoiceDateFormat ?? invoice.invoiceDate,
              subtotal: invoice.subtotal,
              discount: invoice.discount,
              total: invoice.total,
              giftCardAmount: invoice.giftCardAmount,
              totalToPay: invoice.totalToPay,
              legendDescription: invoice.legendDescription,
              emissionType: invoice.emissionType,
              address: invoice.address,
              pointSaleCode: invoice.pointSale?.pointSaleCode ?? invoice.pointSaleCode ?? 0,
            },
            details: invoice.invoiceDetails.map((d) => ({
              productCode: d.productCode,
              description: d.description,
              unitMeasure: unitMeasureMap.get(d.unitMeasureId) ?? null,
              amount: d.amount,
              sellingPrice: d.sellingPrice,
              discount: d.discount,
              subtotal: d.subtotal,
            })),
            user: invoice.user ? { username: invoice.user.username } : null,
            qrDataUrl,
          });

    return this.renderPdf(html, typePrint);
  }

  async generarPdfNota(id: number, printType?: string): Promise<Buffer> {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        saleDetails: true,
        customer: true,
        branchOffice: { include: { company: true } },
        user: true,
      },
    });
    if (!sale) throw new NotFoundException(`Nota de venta con id ${id} no encontrada`);
    if (!sale.branchOffice?.company) {
      throw new NotFoundException('Empresa no configurada para la sucursal de la nota de venta');
    }

    const company = sale.branchOffice.company;
    const typePrint =
      printType === 'carta' || printType === 'media_hoja'
        ? MEDIA_HOJA
        : printType === 'rollo'
          ? ROLLO
          : company.typePrint === ROLLO
            ? ROLLO
            : MEDIA_HOJA;

    const data = {
      company: { name: company.name },
      branchOffice: {
        name: sale.branchOffice.name,
        nit: sale.branchOffice.nit,
        address: sale.branchOffice.address ?? '',
        city: sale.branchOffice.city,
      },
      nota: {
        numero: sale.saleNum,
        fecha: sale.saleDate,
        subtotal: sale.subtotal,
        discount: sale.discount,
        total: sale.total,
      },
      customer: {
        nit: sale.customer.nit,
        name: sale.customer.invoiceName,
      },
      details: sale.saleDetails.map((d) => ({
        description: d.description,
        amount: d.amount,
        sellingPrice: d.sellingPrice,
        subtotal: d.subtotal,
      })),
      user: sale.user ? { username: sale.user.username } : null,
    };

    const html =
      typePrint === ROLLO ? renderNotaVentaRolloHtml(data) : renderNotaVentaCartaHtml(data);

    return this.renderPdf(html, typePrint);
  }

  private async renderPdf(html: string, typePrint: number): Promise<Buffer> {
    const executablePath = findExecutablePath();
    if (!executablePath) {
      throw new BadRequestException('No se encontró un navegador instalado para generar el PDF');
    }

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });

      if (typePrint === MEDIA_HOJA) {
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        });
        return Buffer.from(pdf);
      }

      const mm = await page.evaluate(() => {
        const pxPerMm = 96 / 25.4;
        const el = document.getElementById('hoja') ?? document.body;
        return {
          width: Math.ceil(el.scrollWidth / pxPerMm),
          height: Math.ceil(el.scrollHeight / pxPerMm),
        };
      });

      const pdf = await page.pdf({
        width: `${mm.width}mm`,
        height: `${mm.height}mm`,
        printBackground: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}