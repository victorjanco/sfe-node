import { useState } from 'react';
import { apiPost } from '../api/client';
import { CustomerSearch } from './CustomerSearch';
import { ProductSearch } from './ProductSearch';
import { PdfViewer } from './PdfViewer';
import { Customer, Product, SaleDetailItem, SaleStorePayload } from '../types';
import { factor, formatNumber, nowLocalDatetime } from '../utils/format';

interface NoteSaleFormProps {
  onSuccess?: () => void;
}

interface DraftProduct {
  product_id?: number;
  product_code?: string;
  product_name: string;
  description: string;
  cost_price: number;
  selling_price: number;
  amount: number;
  discount: number;
  subtotal: number;
  products_services_id?: number;
  unit_measure_id?: number;
}

const emptyDraft: DraftProduct = {
  product_name: '',
  description: '',
  cost_price: 0,
  selling_price: 0,
  amount: 1,
  discount: 0,
  subtotal: 0,
};

export function NoteSaleForm({ onSuccess }: NoteSaleFormProps): JSX.Element {
  const [details, setDetails] = useState<SaleDetailItem[]>([]);
  const [draft, setDraft] = useState<DraftProduct>(emptyDraft);
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const [nitCustomer, setNitCustomer] = useState('');
  const [nameCustomer, setNameCustomer] = useState('');
  const [complement, setComplement] = useState('');
  const [emailCustomer, setEmailCustomer] = useState('');
  const [saleDate] = useState(nowLocalDatetime());
  const [discount, setDiscount] = useState(0);
  const [checkEfectivo, setCheckEfectivo] = useState(true);
  const [checkTarjeta, setCheckTarjeta] = useState(false);
  const [checkGiftCard, setCheckGiftCard] = useState(false);
  const [checkOtros, setCheckOtros] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [giftCardAmount, setGiftCardAmount] = useState(0);
  const [withdrawInventory, setWithdrawInventory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ saleId: number; saleNum: number; total: number } | null>(null);
  const [showPdf, setShowPdf] = useState(false);

  const subtotal = details.reduce((acc, d) => acc + factor(d.subtotal), 0);
  const total = subtotal - discount;
  const totalToPay = total - giftCardAmount;

  function selectProduct(p: Product): void {
    setDraft({
      product_id: p.id,
      product_code: p.code,
      product_name: p.tradename,
      description: p.tradename,
      cost_price: factor(p.costPrice),
      selling_price: factor(p.sellingPrice),
      amount: 1,
      discount: 0,
      subtotal: factor(p.sellingPrice),
      products_services_id: p.productsServicesId,
      unit_measure_id: p.unitMeasureId,
    });
  }

  function recalcDraft(): void {
    setDraft((d) => ({
      ...d,
      subtotal: factor(d.amount) * factor(d.selling_price) - factor(d.discount),
    }));
  }

  function addDetail(): void {
    if (!draft.product_name.trim()) return;
    const item: SaleDetailItem = {
      product_id: draft.product_id,
      product_code: draft.product_code,
      product_name: draft.product_name,
      description: draft.description,
      cost_price: factor(draft.cost_price),
      selling_price: factor(draft.selling_price),
      amount: factor(draft.amount),
      discount: factor(draft.discount),
      subtotal: factor(draft.subtotal),
      products_services_id: draft.products_services_id,
      unit_measure_id: draft.unit_measure_id,
      unit_measure: null,
    };
    setDetails([...details, item]);
    setDraft(emptyDraft);
  }

  function updateDetail(i: number, patch: Partial<SaleDetailItem>): void {
    setDetails((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      next[i].subtotal = factor(next[i].amount) * factor(next[i].selling_price) - factor(next[i].discount);
      return next;
    });
  }

  function removeDetail(i: number): void {
    setDetails(details.filter((_, idx) => idx !== i));
  }

  function toggleEfectivo(): void {
    setCheckEfectivo((v) => !v);
    setCheckTarjeta(false);
    setCheckGiftCard(false);
    setCheckOtros(false);
  }

  function toggleTarjeta(): void {
    setCheckTarjeta((v) => !v);
    if (!checkTarjeta) {
      setCheckEfectivo(false);
      setCheckGiftCard(false);
      setCheckOtros(false);
    } else {
      setCheckEfectivo(true);
    }
  }

  function toggleGiftCard(): void {
    setCheckGiftCard((v) => !v);
    if (!checkGiftCard) {
      setCheckEfectivo(false);
      setCheckTarjeta(false);
      setCheckOtros(false);
    } else {
      setCheckEfectivo(true);
    }
  }

  function toggleOtros(): void {
    setCheckOtros((v) => !v);
    if (!checkOtros) {
      setCheckEfectivo(false);
      setCheckTarjeta(false);
      setCheckGiftCard(false);
    } else {
      setCheckEfectivo(true);
    }
  }

  function resetForm(): void {
    setDetails([]);
    setDraft(emptyDraft);
    setDiscount(0);
    setGiftCardAmount(0);
    setCardNumber('');
    setCheckEfectivo(true);
    setCheckTarjeta(false);
    setCheckGiftCard(false);
    setCheckOtros(false);
    setError(null);
    setSuccess(null);
    setNitCustomer('');
    setNameCustomer('');
    setComplement('');
    setEmailCustomer('');
    setCustomerId(undefined);
    setWithdrawInventory(true);
  }

  async function submit(): Promise<void> {
    setError(null);
    if (details.length === 0) {
      setError('Agregue al menos un producto al detalle');
      return;
    }
    if (!(total > 0)) {
      setError('Total debe ser Mayor a 0.00');
      return;
    }

    const payload: SaleStorePayload = {
      id: 0,
      sale_type: 'NOTA VENTA',
      subtotal,
      discount,
      total,
      total_to_pay: totalToPay,
      tax_credit_base_amount: 0,
      customer_id: customerId,
      nit_customer: nitCustomer.trim(),
      name_customer: nameCustomer.trim(),
      email_customer: emailCustomer.trim(),
      complement: complement.trim(),
      sale_date: saleDate,
      change_type: 1,
      money: 'Bs',
      card_number: cardNumber.replace(/-/g, ''),
      gift_card_amount: factor(giftCardAmount),
      check_efectivo: checkEfectivo,
      check_tarjeta: checkTarjeta,
      check_gift_card: checkGiftCard,
      check_otros: checkOtros,
      exception_code: 0,
      type_exception: '0',
      inventory: withdrawInventory ? 1 : 0,
      array_detalle: details.map((d) => ({
        ...d,
        unit_measure:
          typeof d.unit_measure === 'object' && d.unit_measure
            ? d.unit_measure.description
            : d.unit_measure ?? '',
      })),
    };

    setSubmitting(true);
    try {
      const data = await apiPost<{ sale: { id: number; saleNum: number }; message?: string }>(
        '/sale/store_note',
        payload,
      );
      setSuccess({ saleId: data.sale.id, saleNum: data.sale.saleNum, total });
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar la nota de venta');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="card">
        <div className="card-header">
          <h3>Nota de Venta registrada</h3>
        </div>
        <div className="card-body">
          <p>
            Nota de venta <strong>N° {success.saleNum}</strong> registrada por un total de{' '}
            <strong>Bs {formatNumber(success.total)}</strong>.
          </p>
          <p className="notice">Esta venta no genera factura ni se envía al SIAT.</p>
          <div className="actions">
            <button className="btn btn-primary" onClick={() => setShowPdf(true)}>
              Imprimir Nota de Venta
            </button>
            <button className="btn btn-secondary" onClick={resetForm}>
              Nueva Nota de Venta
            </button>
            <button className="btn btn-secondary" onClick={resetForm}>
              Cerrar
            </button>
          </div>
          {showPdf && (
            <PdfViewer id={success.saleId} kind="nota" onClose={() => setShowPdf(false)} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Registrar Nota de Venta (sin factura)</h3>
        <div className="money-badge">Bs</div>
      </div>
      <div className="card-body">
        <div className="field">
          <span>Cliente (opcional)</span>
          <CustomerSearch
            onSelect={(c: Customer) => {
              setCustomerId(c.id);
              setNitCustomer(c.nit);
              setNameCustomer(c.invoiceName || c.name || '');
              setComplement(c.complement ?? '');
              setEmailCustomer(c.email ?? '');
            }}
          />
        </div>
        <div className="grid grid-2">
          <label className="field">
            <span>NIT</span>
            <input className="input" value={nitCustomer} onChange={(e) => setNitCustomer(e.target.value)} placeholder="NIT del cliente" />
          </label>
          <label className="field">
            <span>Nombre / Razón social</span>
            <input className="input" value={nameCustomer} onChange={(e) => setNameCustomer(e.target.value)} placeholder="Nombre del cliente" />
          </label>
          <label className="field">
            <span>Complemento</span>
            <input className="input" value={complement} onChange={(e) => setComplement(e.target.value)} />
          </label>
          <label className="field">
            <span>Correo</span>
            <input className="input" value={emailCustomer} onChange={(e) => setEmailCustomer(e.target.value)} />
          </label>
        </div>

        <h4 className="section-title">DETALLE DE LA NOTA DE VENTA</h4>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Opción</th>
                <th>Código / Descripción</th>
                <th>Cantidad</th>
                <th>Precio Unitario</th>
                <th>Desc. Producto</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {details.map((d, i) => (
                <tr key={i}>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => removeDetail(i)}>
                      Eliminar
                    </button>
                  </td>
                  <td>
                    <div className="code-line">
                      {d.product_code && <span className="code">{d.product_code}</span>}
                      <span>{d.product_name}</span>
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input input-sm text-right"
                      min={0}
                      step="0.01"
                      value={d.amount}
                      onChange={(e) => updateDetail(i, { amount: factor(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input input-sm text-right"
                      min={0}
                      step="0.01"
                      value={d.selling_price}
                      onChange={(e) => updateDetail(i, { selling_price: factor(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input input-sm text-right"
                      min={0}
                      step="0.01"
                      value={d.discount}
                      onChange={(e) => updateDetail(i, { discount: factor(e.target.value) })}
                    />
                  </td>
                  <td className="text-right">{formatNumber(d.subtotal)}</td>
                </tr>
              ))}
              <tr className="draft-row">
                <td>
                  <button className="btn btn-success btn-sm" onClick={addDetail}>
                    Agregar
                  </button>
                </td>
                <td>
                  <ProductSearch onSelect={selectProduct} placeholder="Buscar producto o escribir descripción" />
                  <input
                    type="text"
                    className="input input-sm mt-1"
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value, product_name: e.target.value })}
                    placeholder="Descripción"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="input input-sm text-right"
                    min={0}
                    step="0.01"
                    value={draft.amount}
                    onChange={(e) => setDraft({ ...draft, amount: factor(e.target.value) })}
                    onBlur={recalcDraft}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="input input-sm text-right"
                    min={0}
                    step="0.01"
                    value={draft.selling_price}
                    onChange={(e) => setDraft({ ...draft, selling_price: factor(e.target.value) })}
                    onBlur={recalcDraft}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="input input-sm text-right"
                    min={0}
                    step="0.01"
                    value={draft.discount}
                    onChange={(e) => setDraft({ ...draft, discount: factor(e.target.value) })}
                    onBlur={recalcDraft}
                  />
                </td>
                <td className="text-right">{formatNumber(draft.subtotal)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="text-right">
                  <strong>Sub Total (Bs)</strong>
                </td>
                <td className="text-right">{formatNumber(subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={5} className="text-right">
                  <strong>Descuento (Bs)</strong>
                </td>
                <td>
                  <input
                    type="number"
                    className="input input-sm text-right"
                    min={0}
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(factor(e.target.value))}
                  />
                </td>
              </tr>
              <tr>
                <td colSpan={5} className="text-right">
                  <strong>Total (Bs)</strong>
                </td>
                <td className="text-right">{formatNumber(total)}</td>
              </tr>
              <tr>
                <td colSpan={5} className="text-right">
                  <strong>Monto Gift Card (Bs)</strong>
                </td>
                <td className="text-right">
                  {checkGiftCard ? (
                    <input
                      type="number"
                      className="input input-sm text-right"
                      min={0}
                      step="0.01"
                      value={giftCardAmount}
                      onChange={(e) => setGiftCardAmount(factor(e.target.value))}
                    />
                  ) : (
                    formatNumber(0)
                  )}
                </td>
              </tr>
              <tr>
                <td colSpan={5} className="text-right">
                  <strong>Monto a Pagar (Bs)</strong>
                </td>
                <td className="text-right">{formatNumber(totalToPay)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <h4 className="section-title">Inventario</h4>
        <div className="checkbox-row">
          <label className={`checkbox ${withdrawInventory ? 'checked' : ''}`}>
            <input
              type="checkbox"
              checked={withdrawInventory}
              onChange={() => setWithdrawInventory((v) => !v)}
            />
            Descontar inventario (1: descuento de inventario / 0: sin descuento)
          </label>
        </div>

        <h4 className="section-title">Métodos de Pago</h4>
        <div className="grid grid-4 payment-row">
          <label className={`checkbox ${checkEfectivo ? 'checked' : ''}`}>
            <input type="checkbox" checked={checkEfectivo} onChange={toggleEfectivo} /> EFECTIVO
          </label>
          <label className={`checkbox ${checkTarjeta ? 'checked' : ''}`}>
            <input type="checkbox" checked={checkTarjeta} onChange={toggleTarjeta} /> TARJETA
            {checkTarjeta && (
              <input
                type="text"
                className="input input-sm"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="Número de tarjeta"
                maxLength={19}
              />
            )}
          </label>
          <label className={`checkbox ${checkGiftCard ? 'checked' : ''}`}>
            <input type="checkbox" checked={checkGiftCard} onChange={toggleGiftCard} /> GIFT CARD
          </label>
          <label className={`checkbox ${checkOtros ? 'checked' : ''}`}>
            <input type="checkbox" checked={checkOtros} onChange={toggleOtros} /> OTROS
          </label>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="actions">
          <button className="btn btn-primary" onClick={() => void submit()} disabled={submitting}>
            {submitting ? 'Registrando…' : 'Registrar Nota de Venta'}
          </button>
          <button className="btn btn-secondary" onClick={resetForm} disabled={submitting}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}