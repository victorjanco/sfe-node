import { useEffect, useMemo, useState } from 'react';
import { valorEnLetras } from '@sfe/core';
import { useSaleCatalogs } from '../hooks/useSaleCatalogs';
import { CustomerSearch } from './CustomerSearch';
import { ProductSearch } from './ProductSearch';
import { SaleResult } from './SaleResult';
import { apiGet, apiPost } from '../api/client';
import { EXCEPTIONS, EXCEPTION_LABELS, InvoiceResult, Product, ReasonEvent, SaleDetailItem, SaleStorePayload, SignificantEvent, UnitMeasure } from '../types';
import { factor, formatNumber, nowLocalDatetime, roundFormat } from '../utils/format';
import { DOCUMENT_SECTORS_CODES_TYPE_INVOICES, IDENTITY_DOCUMENT, SECTOR_DOCUMENTS } from '../utils/constants';

interface SaleFormProps {
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
  unit_measure?: UnitMeasure | null;
}

const emptyDraft: DraftProduct = {
  product_name: '',
  description: '',
  cost_price: 0,
  selling_price: 0,
  amount: 1,
  discount: 0,
  subtotal: 0,
  unit_measure: null,
};

export function SaleForm({ onSuccess }: SaleFormProps) {
  const catalogs = useSaleCatalogs();
  const decimals = catalogs.decimals;

  const [activityId, setActivityId] = useState<number>(0);
  const [sectorDocumentId, setSectorDocumentId] = useState<number>(0);
  const [identityDocumentTypeId, setIdentityDocumentTypeId] = useState<number>(0);
  const [typeInvoiceDocumentId, setTypeInvoiceDocumentId] = useState<number>(0);
  const [paymentMethodTypeId, setPaymentMethodTypeId] = useState<number>(0);
  const [branchOfficeId, setBranchOfficeId] = useState<number>(0);

  const [exception, setException] = useState<number>(EXCEPTIONS.NONE);
  const [nitCustomer, setNitCustomer] = useState('');
  const [nameCustomer, setNameCustomer] = useState('');
  const [complement, setComplement] = useState('');
  const [emailCustomer, setEmailCustomer] = useState('');
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);

  const [saleDate] = useState(nowLocalDatetime());
  const [money, setMoney] = useState('Bs');
  const [changeType, setChangeType] = useState<number>(1);

  const [checkEfectivo, setCheckEfectivo] = useState(true);
  const [checkTarjeta, setCheckTarjeta] = useState(false);
  const [checkGiftCard, setCheckGiftCard] = useState(false);
  const [checkOtros, setCheckOtros] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [giftCardAmount, setGiftCardAmount] = useState<number>(0);
  const [withdrawInventory, setWithdrawInventory] = useState(true);
  const [reasonEventId, setReasonEventId] = useState<number>(0);
  const [significantEventId, setSignificantEventId] = useState<number>(0);

  const [discount, setDiscount] = useState<number>(0);
  const [details, setDetails] = useState<SaleDetailItem[]>([]);
  const [draft, setDraft] = useState<DraftProduct>(emptyDraft);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InvoiceResult | null>(null);

  useEffect(() => {
    if (activityId === 0 && catalogs.activities.length > 0) setActivityId(catalogs.activities[0].id);
    if (sectorDocumentId === 0 && catalogs.sectorDocuments.length > 0) setSectorDocumentId(catalogs.sectorDocuments.find((d) => d.classifierCode === String(SECTOR_DOCUMENTS['FacturaCompraVenta']))?.id || catalogs.sectorDocuments[0].id);
    if (identityDocumentTypeId === 0 && catalogs.identityDocumentTypes.length > 0) {
      const nit = catalogs.identityDocumentTypes.find((d) => d.classifierCode === '4' || d.description.toLowerCase().includes('nit'));
      setIdentityDocumentTypeId((nit ?? catalogs.identityDocumentTypes[0]).id);
    }
    if (typeInvoiceDocumentId === 0 && catalogs.typeInvoiceDocuments.length > 0) {
      setTypeInvoiceDocumentId(catalogs.typeInvoiceDocuments.find((d) => d.classifierCode === String(DOCUMENT_SECTORS_CODES_TYPE_INVOICES[SECTOR_DOCUMENTS['FacturaCompraVenta']]))?.id || catalogs.typeInvoiceDocuments[0].id);
    }
    if (branchOfficeId === 0 && catalogs.branchOffices.length > 0) setBranchOfficeId(catalogs.branchOffices[0].id);
    if (catalogs.activeSignificantEvent) {
      setSignificantEventId(catalogs.activeSignificantEvent.id);
      setReasonEventId(catalogs.activeSignificantEvent.reasonEventId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogs.loading]);

  const subtotal = useMemo(
    () => roundFormat(details.reduce((acc, d) => acc + factor(d.subtotal), 0), decimals.total),
    [details, decimals.total],
  );
  const total = useMemo(() => roundFormat(subtotal - factor(discount), decimals.total), [subtotal, discount, decimals.total]);
  const totalToPay = useMemo(
    () => roundFormat(total - factor(giftCardAmount), decimals.total),
    [total, giftCardAmount, decimals.total],
  );
  const taxCreditBase = totalToPay;
  const totalLiteral = useMemo(() => valorEnLetras(total, 'Bolivianos'), [total]);

  const activity = catalogs.activities.find((a) => a.id === activityId) ?? catalogs.activities[0];

  function recalcDraft(): void {
    setDraft((d) => ({
      ...d,
      subtotal: roundFormat(factor(d.amount) * factor(d.selling_price) - factor(d.discount), decimals.price),
    }));
  }

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
      unit_measure: p.unitMeasure ?? null,
    });
  }

  function addDetail(): void {
    if (!draft.product_name.trim()) {
      setError('Seleccione un producto para agregar al detalle');
      return;
    }
    if (factor(draft.amount) <= 0 || factor(draft.selling_price) <= 0) {
      setError('Cantidad y precio deben ser mayores a 0');
      return;
    }
    setDetails((prev) => [
      ...prev,
      {
        id: draft.product_id,
        product_id: draft.product_id,
        product_code: draft.product_code,
        product_name: draft.product_name,
        description: draft.description,
        cost_price: draft.cost_price,
        selling_price: draft.selling_price,
        amount: draft.amount,
        discount: draft.discount,
        subtotal: roundFormat(factor(draft.amount) * factor(draft.selling_price) - factor(draft.discount), decimals.price),
        products_services_id: draft.products_services_id,
        unit_measure_id: draft.unit_measure_id,
        unit_measure: draft.unit_measure ?? null,
      },
    ]);
    setDraft(emptyDraft);
    setError(null);
  }

  function updateDetail(index: number, patch: Partial<SaleDetailItem>): void {
    setDetails((prev) => {
      const next = prev.map((d, i) => (i === index ? { ...d, ...patch } : d));
      const row = next[index];
      row.subtotal = roundFormat(factor(row.amount) * factor(row.selling_price) - factor(row.discount), decimals.price);
      return next;
    });
  }

  function removeDetail(index: number): void {
    setDetails((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleEfectivo(): void {
    setCheckEfectivo((v) => !v);
    setCheckTarjeta(false);
    setCheckGiftCard(false);
    setCheckOtros(false);
  }
  function toggleTarjeta(): void {
    setCheckTarjeta((v) => !v);
    setCheckEfectivo(false);
  }
  function toggleGiftCard(): void {
    setCheckGiftCard((v) => !v);
    setCheckEfectivo(false);
  }
  function toggleOtros(): void {
    setCheckOtros((v) => !v);
    setCheckEfectivo(false);
    setCheckTarjeta(false);
    setCheckGiftCard(false);
  }

  function selectException(code: number): void {
    setException(code);
    if (code !== EXCEPTIONS.NONE) setCustomerId(undefined);
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
    setResult(null);
    setNitCustomer('');
    setNameCustomer('');
    setComplement('');
    setEmailCustomer('');
    setCustomerId(undefined);
    setException(EXCEPTIONS.NONE);
    setWithdrawInventory(true);
    setReasonEventId(0);
    setSignificantEventId(0);
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
    if (exception === EXCEPTIONS.NONE && !nitCustomer.trim() && !nameCustomer.trim()) {
      setError('Consignar datos del cliente (NIT o nombre)');
      return;
    }
    if (exception === EXCEPTIONS.FOREING && !nameCustomer.trim()) {
      setError('Consignar el nombre del cliente');
      return;
    }
    if (!activity) {
      setError('Seleccione una actividad económica');
      return;
    }

    let finalException = exception;
    //VERIFICAR SI EL TIPO DOCUMENTO IDENTIDAD ES NIT
    let identityDocumentCode= catalogs.identityDocumentTypes.find((d) => d.id === identityDocumentTypeId)?.classifierCode;

    if (identityDocumentCode === String(IDENTITY_DOCUMENT.NIT) && exception === EXCEPTIONS.NONE && nitCustomer.trim()) {
      try {
        const check = await apiGet<{ valido: boolean; mensaje?: string }>('/siat/verificar_nit', {
          nit: nitCustomer.trim(),
        });
        if (!check.valido) {
          const continuar = window.confirm(
            `El NIT ${nitCustomer.trim()} no es válido ante el SIAT.\n\n${check.mensaje ?? ''}\n\n¿Desea continuar la factura con la excepción "${EXCEPTION_LABELS[EXCEPTIONS.FOREING]}" (código 1)?`,
          );
          if (!continuar) {
            setError(`El NIT ${nitCustomer.trim()} no es válido ante el SIAT. Factura no emitida.`);
            return;
          }
          finalException = EXCEPTIONS.FOREING;
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? `No se pudo verificar el NIT: ${e.message}`
            : 'No se pudo verificar el NIT',
        );
        return;
      }
    }

    const payload: SaleStorePayload = {
      id: 0,
      invoice_num: 0,
      sale_type: 'FACTURA',
      subtotal,
      discount: factor(discount),
      total,
      total_to_pay: totalToPay,
      tax_credit_base_amount: taxCreditBase,
      customer_id: customerId,
      nit_customer: nitCustomer.trim(),
      name_customer: nameCustomer.trim(),
      email_customer: emailCustomer.trim(),
      complement: complement.trim(),
      sale_date: saleDate,
      change_type: changeType,
      money,
      card_number: cardNumber.replace(/-/g, ''),
      gift_card_amount: factor(giftCardAmount),
      check_efectivo: checkEfectivo,
      check_tarjeta: checkTarjeta,
      check_gift_card: checkGiftCard,
      check_otros: checkOtros,
      exception_code: finalException,
      type_exception: String(finalException),
      inventory: withdrawInventory ? 1 : 0,
      array_detalle: details.map((d) => ({
        ...d,
        unit_measure:
          typeof d.unit_measure === 'object' && d.unit_measure
            ? d.unit_measure.description
            : d.unit_measure ?? '',
        product_name: d.product_name,
        description: d.description || d.product_name,
      })),
      branch_office_id: branchOfficeId || catalogs.branchOffices[0]?.id,
      activity_id: activity.id,
      sector_document_id: sectorDocumentId || catalogs.sectorDocuments[0]?.id,
      payment_method_type_id: checkOtros && paymentMethodTypeId ? paymentMethodTypeId : undefined,
      identity_document_type_id: identityDocumentTypeId || catalogs.identityDocumentTypes[0]?.id,
      type_invoice_document_id: typeInvoiceDocumentId || catalogs.typeInvoiceDocuments[0]?.id,
      reason_event_id: reasonEventId || undefined,
      significant_event_id: significantEventId || undefined,
    };

    setSubmitting(true);
    try {
      const data = await apiPost<InvoiceResult>('/sale/store', payload);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar la factura');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <SaleResult result={result} onReset={resetForm} onSuccess={onSuccess} />;
  }

  if (catalogs.loading) {
    return <div className="card p-4 text-center">Cargando catálogos…</div>;
  }
  if (catalogs.error) {
    return (
      <div className="card p-4">
        <p className="error-text">{catalogs.error}</p>
        <button className="btn" onClick={() => void catalogs.reload()}>
          Reintentar
        </button>
      </div>
    );
  }

  const showCustomer = exception === EXCEPTIONS.NONE || exception === EXCEPTIONS.FOREING;

  return (
    <div className="card">
      <div className="card-header">
        <h3>Registrar Venta — Factura Compra Venta</h3>
        <div className="money-badge">{money}</div>
      </div>
      <div className="card-body">
        <div className="grid grid-2">
          <label className="field">
            <span>Actividad económica (SIAT)</span>
            <select
              className="input"
              value={activityId}
              onChange={(e) => setActivityId(Number(e.target.value))}
            >
              {catalogs.activities.length === 0 && <option value={0}>Sin actividades activas</option>}
              {catalogs.activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.description}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Sucursal</span>
            <select className="input" value={branchOfficeId} onChange={(e) => setBranchOfficeId(Number(e.target.value))}>
              {catalogs.branchOffices.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-4">
          <label className="field">
            <span>Tipo documento (SIAT)</span>
            <select
              className="input"
              value={identityDocumentTypeId}
              onChange={(e) => setIdentityDocumentTypeId(Number(e.target.value))}
            >
              {catalogs.identityDocumentTypes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.description}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tipo de factura (SIAT)</span>
            <select
              className="input"
              value={typeInvoiceDocumentId}
              onChange={(e) => setTypeInvoiceDocumentId(Number(e.target.value))}
            >
              {catalogs.typeInvoiceDocuments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.description}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Documento sector (SIAT)</span>
            <select
              className="input"
              value={sectorDocumentId}
              onChange={(e) => setSectorDocumentId(Number(e.target.value))}
            >
              {catalogs.sectorDocuments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.description}
                </option>
              ))}
            </select>
          </label>
            {catalogs.activeSignificantEvent ? (
              <label className="field">
                <span>Evento significativo activo (SIAT)</span>
                <div className="input" style={{ backgroundColor: '#fff3cd', borderColor: '#ffc107' }}>
                  EVENTO #{catalogs.activeSignificantEvent.number} — {catalogs.activeSignificantEvent.reasonEvent?.description ?? catalogs.activeSignificantEvent.reasonEventCode}
                </div>
              </label>
            ) : (
              <>
                <label className="field">
                  <span>Motivo evento (SIAT)</span>
                  <select
                    className="input"
                    value={reasonEventId}
                    onChange={(e) => setReasonEventId(Number(e.target.value))}
                  >
                    <option value={0}>NINGUNO</option>
                    {catalogs.reasonEvents.map((r: ReasonEvent) => (
                      <option key={r.id} value={r.id}>
                        {r.description}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Evento significativo (SIAT)</span>
                  <select
                    className="input"
                    value={significantEventId}
                    onChange={(e) => setSignificantEventId(Number(e.target.value))}
                  >
                    <option value={0}>NINGUNO</option>
                    {catalogs.significantEvents.map((s: SignificantEvent) => (
                      <option key={s.id} value={s.id}>
                        #{s.number} - {s.reasonEvent?.description ?? s.reasonEventCode}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          <label className="field">
            <span>Moneda</span>
            <select className="input" value={money} onChange={(e) => setMoney(e.target.value)}>
              <option value="Bs">Bolivianos (Bs)</option>
              <option value="Sus">Dólares (Sus)</option>
            </select>
          </label>
        </div>

        <div className="field">
          <span>Tipo de excepción</span>
          <div className="checkbox-row">
            {Object.values(EXCEPTIONS).map((code) => (
              <label key={code} className={`checkbox ${exception === code ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={exception === code}
                  onChange={() => selectException(code)}
                />
                {EXCEPTION_LABELS[code]}
              </label>
            ))}
          </div>
        </div>

        {showCustomer && (
          <div className="grid grid-2 customer-box">
            <div className="field">
              <span>Cliente</span>
              <CustomerSearch
                onSelect={(c) => {
                  setCustomerId(c.id);
                  setNitCustomer(c.nit);
                  setNameCustomer(c.invoiceName || c.name || '');
                  setComplement(c.complement ?? '');
                  setEmailCustomer(c.email ?? '');
                  if (c.identityDocumentTypeId) setIdentityDocumentTypeId(c.identityDocumentTypeId);
                }}
              />
            </div>
            <div className="grid grid-2">
              <label className="field">
                <span>NIT</span>
                <input
                  className="input"
                  value={nitCustomer}
                  onChange={(e) => setNitCustomer(e.target.value)}
                  placeholder="NIT del cliente"
                />
              </label>
              <label className="field">
                <span>Nombre / Razón social</span>
                <input
                  className="input"
                  value={nameCustomer}
                  onChange={(e) => setNameCustomer(e.target.value)}
                  placeholder="Nombre del cliente"
                />
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
          </div>
        )}

        {!showCustomer && (
          <div className="notice">Venta sin cliente (excepción SIAT: {EXCEPTION_LABELS[exception]}).</div>
        )}

        <h4 className="section-title">DETALLE DE VENTA</h4>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Opción</th>
                <th>Código / Descripción</th>
                <th>Cantidad</th>
                <th>U. Medida</th>
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
                  <td>{typeof d.unit_measure === 'object' && d.unit_measure ? d.unit_measure.description : d.unit_measure || '—'}</td>
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
                  <td className="text-right">{formatNumber(d.subtotal, decimals.price)}</td>
                </tr>
              ))}
              <tr className="draft-row">
                <td>
                  <button className="btn btn-success btn-sm" onClick={addDetail}>
                    Agregar
                  </button>
                </td>
                <td>
                  <ProductSearch onSelect={selectProduct} />
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
                <td>{typeof draft.unit_measure === 'object' && draft.unit_measure ? draft.unit_measure.description : draft.unit_measure || '—'}</td>
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
                <td className="text-right">{formatNumber(draft.subtotal, decimals.price)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} className="text-right">
                  <strong>Sub Total ({money})</strong>
                </td>
                <td className="text-right">{formatNumber(subtotal, decimals.total)}</td>
              </tr>
              <tr>
                <td colSpan={6} className="text-right">
                  <strong>Descuento ({money})</strong>
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
                <td colSpan={6} className="text-right">
                  <strong>Total ({money})</strong>
                </td>
                <td className="text-right">{formatNumber(total, decimals.total)}</td>
              </tr>
              <tr>
                <td colSpan={6} className="text-right">
                  <strong>Monto Gift Card ({money})</strong>
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
                    formatNumber(0, decimals.total)
                  )}
                </td>
              </tr>
              <tr>
                <td colSpan={6} className="text-right">
                  <strong>Monto a Pagar ({money})</strong>
                </td>
                <td className="text-right">{formatNumber(totalToPay, decimals.total)}</td>
              </tr>
              <tr>
                <td colSpan={6} className="text-right">
                  <strong>Importe Base Crédito Fiscal (Bs)</strong>
                </td>
                <td className="text-right">{formatNumber(taxCreditBase, decimals.total)}</td>
              </tr>
              <tr>
                <td colSpan={6} className="text-right">
                  <strong>Total en letras</strong>
                </td>
                <td className="text-right literal">{totalLiteral}</td>
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
            {checkOtros && (
              <select
                className="input input-sm"
                value={paymentMethodTypeId}
                onChange={(e) => setPaymentMethodTypeId(Number(e.target.value))}
              >
                <option value={0}>Seleccionar método</option>
                {catalogs.paymentMethodTypes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.description}
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="actions">
          <button className="btn btn-primary" onClick={() => void submit()} disabled={submitting}>
            {submitting ? 'Facturando…' : 'Facturar'}
          </button>
          <button className="btn btn-secondary" onClick={resetForm} disabled={submitting}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}