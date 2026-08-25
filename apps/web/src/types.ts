export interface CatalogBase {
  id: number;
  classifierCode?: string;
  description: string;
  state?: number;
}

export interface Activity extends CatalogBase {
  caebCode: string;
  activityType: string;
}

export interface SectorDocument extends CatalogBase {}

export interface IdentityDocumentType extends CatalogBase {}

export interface TypeInvoiceDocument extends CatalogBase {}

export interface PaymentMethodType extends CatalogBase {}

export interface UnitMeasure extends CatalogBase {}

export interface BranchOffice {
  id: number;
  nit: string;
  name: string;
  tradename: string;
  code: number;
  address: string;
  city: string;
  cityTaxes: string;
  state: number;
}

export interface PointSale {
  id: number;
  pointSaleCode: number;
  pointSaleName: string;
  pointSaleTypeName: string;
  state: number;
  branchOfficeId: number;
}

export interface TypeMoneySaleResponse {
  DECIMAL_PRODUCT: number;
  DECIMAL_PRICE: number;
  DECIMAL_AMOUNT: number;
  DECIMAL_DISCOUNT: number;
  DECIMAL_TOTALS?: number;
  TYPE_PRINT: number;
  TYPE_MONEY_SALE: string;
  branch_offices: BranchOffice[];
  point_sales: PointSale[];
}

export interface Customer {
  id: number;
  code: number;
  nit: string;
  invoiceName: string;
  name?: string | null;
  complement?: string | null;
  email?: string | null;
  identityDocumentTypeId?: number | null;
  identityDocumentType?: IdentityDocumentType | null;
}

export interface Product {
  id: number;
  code: string;
  tradename: string;
  genericName: string;
  costPrice: string;
  sellingPrice: string;
  unitMeasureId: number;
  productsServicesId: number;
  minimumStock: number;
  isStockControlled?: boolean;
  unitMeasure?: UnitMeasure | null;
}

export interface SaleDetailItem {
  id?: number;
  product_id?: number;
  product_code?: string;
  product_name: string;
  description?: string;
  cost_price?: number;
  selling_price: number;
  amount: number;
  subtotal: number;
  discount: number;
  total?: number;
  products_services_id?: number;
  unit_measure_id?: number;
  unit_measure?: string | UnitMeasure | null;
  serial_number?: string | null;
  imei_number?: string | null;
}

export interface SaleStorePayload {
  id?: number;
  invoice_num?: number;
  sale_type: 'FACTURA' | 'NOTA VENTA';
  subtotal: number;
  discount: number;
  total: number;
  total_to_pay: number;
  tax_credit_base_amount: number;
  customer_id?: number;
  nit_customer?: string;
  name_customer?: string;
  email_customer?: string;
  complement?: string;
  sale_date: string;
  change_type: number;
  money: string;
  card_number?: string;
  gift_card_amount: number;
  identity_document_type_code?: string;
  check_efectivo: boolean;
  check_tarjeta: boolean;
  check_gift_card: boolean;
  check_otros: boolean;
  exception_code: number;
  type_exception: string;
  inventory?: number;
  array_detalle: SaleDetailItem[];
  company_id?: number;
  branch_office_id?: number;
  activity_id?: number;
  sector_document_id?: number;
  payment_method_type_id?: number;
  identity_document_type_id?: number;
  type_invoice_document_id?: number;
  reason_event_id?: string | number;
  significant_event_id?: number;
}

export interface InvoiceResult {
  invoice: Invoice;
  invoice_result: {
    transaccion: boolean;
    codigoEstado: number;
    codigoRecepcion: string;
  };
}

export interface Invoice {
  id: number;
  invoiceNum: number;
  invoiceNumFormat: string;
  invoiceDate: string;
  activityNum: string;
  codeCustomer: string;
  nitCustomer: string;
  customerName: string;
  identityDocumentTypeCode: string;
  typeInvoiceDocumentCode: string;
  sectorDocumentCode: string;
  paymentMethodTypeCode: string;
  branchOfficeCode: string;
  pointSaleCode: string;
  currencyCode: string;
  changeType: string;
  subtotal: string;
  discount: string;
  total: string;
  giftCardAmount: string;
  totalToPay: string;
  taxCreditBaseAmount: string;
  iva: string;
  controlCode: string;
  address: string;
  legendDescription: string;
  receptionCode: string;
  emissionType: number;
  synchronizedSiat: number;
  exceptionCode: number;
  cuis: string;
  cufd: string;
  cuf: string;
  urlXml: string;
  state: string;
  customerId: number;
  activityId: number;
}

export interface SaleRow {
  id: number;
  saleNum: number;
  saleType: string;
  saleDate: string;
  subtotal: string;
  discount: string;
  total: string;
  synchronized: number;
  state: number;
  customer: Customer;
  branchOffice?: BranchOffice;
  saleDetails: SaleDetailItem[];
  invoiceSales: { invoice: Invoice }[];
}

export interface SaleIndexSummary {
  count: number;
  total: number | string;
  subtotal: number | string;
  discount: number | string;
}

export interface SaleIndexResponse {
  items: SaleRow[];
  total: number;
  summary: SaleIndexSummary;
}

export const EXCEPTIONS = {
  NONE: 0,
  FOREING: 1,
  MINOR_SALES: 2,
  TAX_CONTROL: 3,
} as const;

export const EXCEPTION_LABELS: Record<number, string> = {
  [EXCEPTIONS.NONE]: 'Ninguna',
  [EXCEPTIONS.FOREING]: '99001 (Extranjero no inscrito)',
  [EXCEPTIONS.MINOR_SALES]: '99003 (Ventas menores del día)',
  [EXCEPTIONS.TAX_CONTROL]: '99002 (Control Tributario)',
};

export interface User {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
  userRoles?: Array<{
    role: {
      id: number;
      name: string;
      description?: string;
    };
  }>;
  userPermissions?: Array<{
    permission: {
      id: number;
      name: string;
      description?: string;
    };
  }>;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  rolePermissions?: Array<{
    permission: {
      id: number;
      name: string;
      description?: string;
    };
  }>;
  userRoles?: Array<{
    user: {
      id: number;
      username: string;
    };
  }>;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  module?: string;
  action?: string;
  isActive: boolean;
  createdAt?: string | null;
  rolePermissions?: Array<{
    role: {
      id: number;
      name: string;
    };
  }>;
  userPermissions?: Array<{
    user: {
      id: number;
      username: string;
    };
  }>;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  address?: string | null;
  description?: string | null;
  state: number;
  branchOfficeId: number;
  branchOffice?: BranchOffice;
}

export interface InventoryRow {
  id: number;
  quantity: string;
  availableQuantity: string;
  unitCost: string;
  state: number;
  productId: number;
  warehouseId: number;
  product: Product;
  warehouse: Warehouse;
}

export interface InventoryMovementRow {
  id: number;
  movementType: 'IN' | 'OUT';
  quantity: string;
  unitCost: string;
  stockAfter: string;
  referenceType?: string | null;
  referenceId?: number | null;
  state: number;
  productId: number;
  warehouseId: number;
  userId: number;
  createdAt?: string | null;
  product: Product;
  warehouse: Warehouse;
  user: { username: string };
}

export type InventoryEntryType = 'INITIAL' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN';
export type InventoryExitType = 'ADJUSTMENT' | 'DAMAGE';

export interface InventoryBalanceRow {
  product: Product;
  warehouse: Warehouse;
  initialQty: number;
  initialValue: number;
  entriesQty: number;
  entriesValue: number;
  exitsQty: number;
  exitsValue: number;
  finalQty: number;
  finalValue: number;
}

export interface InventoryEntryDetailPayload {
  productId: number;
  quantity: number;
  costPrice: number;
}

export interface InventoryEntryPayload {
  entryType: InventoryEntryType;
  reference?: string;
  warehouseId: number;
  details: InventoryEntryDetailPayload[];
}

export interface InventoryExitDetailPayload {
  productId: number;
  quantity: number;
}

export interface InventoryExitPayload {
  exitType: InventoryExitType;
  reference?: string;
  warehouseId: number;
  details: InventoryExitDetailPayload[];
}

export const ENTRY_TYPE_LABELS: Record<InventoryEntryType, string> = {
  INITIAL: 'Stock Inicial',
  PURCHASE: 'Compra',
  ADJUSTMENT: 'Ajuste',
  RETURN: 'Devolución',
};

export const EXIT_TYPE_LABELS: Record<InventoryExitType, string> = {
  ADJUSTMENT: 'Ajuste',
  DAMAGE: 'Baja / Daño',
};