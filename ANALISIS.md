# Análisis del Sistema SFE Facturación IC

## 1. Arquitectura General

```
sfe-node/
├── apps/api/          NestJS + Prisma + PostgreSQL
│   ├── src/
│   │   ├── common/    Constantes SIAT, timezone
│   │   ├── modules/   Módulos NestJS
│   │   └── prisma/    Schema, seed, migraciones
│   ├── keys/          Certificados SIAT (privados, NO versionar)
│   └── public/        XMLs generados (NO versionar)
├── apps/web/          React + Vite + TypeScript
│   └── src/
│       ├── api/       Cliente HTTP
│       ├── components/
│       ├── context/   AuthContext (JWT)
│       ├── hooks/
│       └── types.ts
└── node_modules/      Monorepo npm workspaces
```

## 2. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS 10, Prisma ORM 6, PostgreSQL 15 |
| Frontend | React 18, Vite, TypeScript 5 |
| Auth | JWT Bearer + CASL (autorización) |
| SIAT | SOAP client propio, XML digital signature (xml-crypto) |
| Tests | Vitest (82/83 pasan, 1 pre-existing failure) |
| DB | PostgreSQL en Laragon, timezone `America/La_Paz` |
| Paquetes | `tar` CLI para empaquetado de facturas |

## 3. Base de Datos

- **103 tablas** en `public` schema
- **DateTime**: `timestamp(3) with time zone` (Prisma `@db.Timestamptz(3)`)
- **Migraciones**: 3 archivos SQL, `TIMESTAMPTZ(3)`
- **Conexión**: `.env` con `timezone=America/La_Paz`
- **Reset**: `npx prisma db push --accept-data-loss` + `npx prisma db seed`

## 4. Módulos API (NestJS)

```
src/modules/
├── auth/                  Login, JWT, strategies
├── authorization/         CASL, CheckAbility decorator
├── catalog-siat/          Catálogos SIAT (sector, tipo doc, etc.)
├── contingency/           CRUD contingencias (CAFC)
├── inventory/             Inventario, kardex, almacenes
├── invoice-package-reception/  Recepción de paquetes SIAT
├── sale/                  Ventas, facturas, notas
│   ├── sale.service.ts    Lógica principal de facturación
│   ├── sale.controller.ts REST endpoints
│   ├── sale.module.ts     Importa SignificantEventModule
│   ├── factura-xml.ts     Generación XML factura
│   └── dto/               Data transfer objects
├── significant-event/     CRUD eventos significativos + SIAT sync
├── siat/                  Integración SIAT completa
│   ├── siat.service.ts    Solicitud CUFD
│   ├── siat-emision.client.ts  Emisión, recepción paquetes
│   ├── siat-soap.client.ts     SOAP client (todas las ops)
│   ├── siat-config.service.ts  Config, resolución de claves
│   ├── siat-expiration.service.ts  Expiración TOKEN/CUIS/CUFD/CAFC
│   └── firma-xml.ts       XML Digital Signature
├── system-config/         Config sistema (SUPER_ADMIN)
└── users/                 CRUD usuarios, roles, permisos
```

## 5. Flujo de Facturación (SaleService.store())

```
1. runAll() → Expirar TOKEN/CUIS/CUFD/CAFC vencidos
2. Validar total > 0
3. Resolver: empresa, sucursal, punto de venta
4. Buscar CUIS activo (state=1)
5. resolveEmissionEvent() → reasonEventCode, significantEvent, emissionType
   - Si significant_event_id → evento existente
   - Si reason_event_id → busca por motivo
   - Si no → ONLINE
6. resolveCufdForEvent() → CUFD según motivo:
   - Motivo 1-2: state2=1 (72hs)
   - Motivo 3-7: state3=1 (15 días)
   - Default: state=1
   - Si no hay: solicitarCufd() automático
7. Resolver cliente, sector doc, tipo doc, actividad
8. Generar CUF (procesoCuf de @sfe/core)
9. Generar XML (buildFacturaXml)
10. Firmar XML (prepararArchivo con xml-crypto)
11. Si ONLINE → verificarComunicacion() + recepcionFactura()
    Si OFFLINE → solo guardar, sin llamada SIAT
12. Crear: sale, saleDetail, invoice, invoiceDetail, invoiceSale
13. Si OFFLINE → vincular invoice a significantEvent (significantEventInvoice)
```

## 6. Eventos Significativos

### Tablas

- **`significant_event`**: número, código SIAT, fechas, CUFD evento, motivo, sucursal, punto venta
- **`significant_event_invoice`**: vínculo factura-evento (cuando offline)
- **`reason_event`**: classifier codes 1-7
  - 1-2: corte internet/web → CUFD state2 (72hs)
  - 3-4: zonas sin internet → CUFD state3 (15 días)
  - 5-7: energía/software/hardware → CUFD state3 (15 días)

### Flujo

- Formulario venta → auto-detecta evento activo (`get_active_event`)
- Si evento activo → muestra label, bloquea dropdown
- Si no evento → dropdown de motivo
- Al guardar offline → `findOrCreateActiveEvent()` → vincula factura
- Envío manual → `sendInvoiceSignificantEvent()` → registra evento + envía paquetes

## 7. Integración SIAT

### Configuración

- **Ambiente**: Pilot (`SIAT_AMBIENTE=2`)
- **URL**: `https://pilotosiatservicios.impuestos.gob.bo/v2`
- **Namespace**: `https://siat.impuestos.gob.bo/`

### Routing por Sector

- Sector 1 → `ServicioFacturacionCompraVenta`
- Sector 16 → `ServicioFacturacionComputarizada`
- Sectores 2, 5, 11, 14 → por modalidad
- Default → `ServicioFacturacionComputarizada`

### Operaciones Implementadas

- `verificarComunicacion`, `solicitudCuis`, `solicitudCufd`
- `recepcionPaqueteFactura`, `validacionPaqueteFactura`
- `registroEventoSignificativo`, `consultaEventoSignificativo`
- `solicitudAnulacionFactura`

### XML Digital Signature

- RSA-SHA256, enveloped-signature, X509Data
- Certificados en `keys/` (NO versionar)
- Dependencia: `xml-crypto` v6.1.2

## 8. Sistema de Permisos

- **CASL**: `subjectMap` con underscore keys
- **Decorator**: `@CheckAbility({ action, subject })`
- **Sidebar**: filtra por permisos, muestra padre si algún hijo es visible
- **Frontend**: `CheckPermission` componente + `AuthContext`
- **Seed**: 55 permisos, 5 roles, 2 usuarios

## 9. Frontend (React)

### Componentes Clave

- `SaleForm.tsx` — formulario de venta (780 líneas)
- `SignificantEventList.tsx` — CRUD eventos
- `ContingencyList.tsx` — CRUD contingencias
- `SiatModule.tsx` — panel SIAT (CUIS/CUFD/TOKEN)
- `Sidebar.tsx` — navegación con permisos

### Hooks

- `useSaleCatalogs.ts` — catálogos + evento activo
- `AuthContext` — JWT + permisos

### Tipos

`SignificantEvent`, `ReasonEvent`, `Contingency`, `InvoiceResult`, etc.

## 10. Zona Horaria

- **DB**: `timestamp(3) with time zone` + `timezone=America/La_Paz`
- **Schema**: `@db.Timestamptz(3)` en todos los DateTime
- **Migraciones**: `TIMESTAMPTZ(3)`
- **Luxon**: `src/common/date/bolivia-date.ts` con helpers (`nowBolivia`, `formatSiatEmision`, etc.)
- **Prisma**: envía UTC, recibe UTC, convierte a local en frontend

## 11. Variables de Entorno (.env)

```bash
DATABASE_URL=postgresql://postgres:root@localhost:5432/sfe_node
PORT=3000
JWT_SECRET=...
SIAT_ENABLED=true
SIAT_RAZON_SOCIAL="MORENO PEREZ HUMBERTO"
SIAT_BASE_URL="https://pilotosiatservicios.impuestos.gob.bo/v2"
SIAT_TOKEN=...
SIAT_SISTEMA="7755FB9029E483B79F80E2F"
SIAT_NIT="2947679018"
SIAT_AMBIENTE=2
SIAT_MODALIDAD=1
```

## 12. Comandos Útiles

```bash
# API
cd apps/api && npm run start:dev

# Web
cd apps/web && npm run dev

# Build
cd apps/api && npx nest build
cd apps/web && npx tsc --noEmit

# Tests
cd apps/api && npm test

# DB
cd apps/api && npx prisma db push --accept-data-loss
cd apps/api && npx prisma db seed
```

## 13. Estado Actual

| Área | Estado |
|------|--------|
| Build API | ✅ 0 errores |
| Build Web | ✅ 0 errores |
| Tests | ✅ 82/83 |
| DB | ✅ PostgreSQL, 103 tablas |
| Eventos Significativos | ✅ CRUD + SIAT sync |
| Contingencias | ✅ CRUD + UI |
| Facturación offline | ✅ Firma XML + vincula evento |
| CUFD auto-generación | ✅ SiatService.solicitarCufd() |
| Permisos | ✅ CASL + Sidebar |
| XML Digital Signature | ✅ xml-crypto + certificados |

## 14. Archivos de Contexto para Otros Agentes

### Archivos Clave del Backend

| Archivo | Descripción |
|---------|-------------|
| `apps/api/src/modules/sale/sale.service.ts` | Lógica principal de facturación |
| `apps/api/src/modules/sale/factura-xml.ts` | Generación XML de factura |
| `apps/api/src/modules/siat/siat-soap.client.ts` | SOAP client SIAT |
| `apps/api/src/modules/siat/siat-emision.client.ts` | Emisión y recepción |
| `apps/api/src/modules/siat/siat.service.ts` | Solicitud CUFD |
| `apps/api/src/modules/siat/firma-xml.ts` | XML Digital Signature |
| `apps/api/src/modules/significant-event/significant-event.service.ts` | Eventos significativos |
| `apps/api/src/common/siat.constants.ts` | Constantes SIAT |
| `apps/api/src/common/date/bolivia-date.ts` | Utilidades de timezone |
| `apps/api/prisma/schema.prisma` | Schema de base de datos |

### Archivos Clave del Frontend

| Archivo | Descripción |
|---------|-------------|
| `apps/web/src/components/SaleForm.tsx` | Formulario de venta |
| `apps/web/src/components/Sidebar.tsx` | Navegación con permisos |
| `apps/web/src/components/SiatModule.tsx` | Panel SIAT |
| `apps/web/src/hooks/useSaleCatalogs.ts` | Catálogos + evento activo |
| `apps/web/src/types.ts` | Tipos TypeScript |
| `apps/web/src/utils/constants.ts` | Constantes frontend |
| `apps/web/src/utils/format.ts` | Formateo de fechas/números |

### Scripts de Base de Datos

| Archivo | Descripción |
|---------|-------------|
| `apps/api/prisma/seed.ts` | Datos iniciales (permisos, roles, catálogos) |
| `apps/api/prisma/migrations/20260815164546_init_schema/migration.sql` | Migración inicial |
| `apps/api/prisma/migrations/20260816210907_add_reason_event_change_type/migration.sql` | Reason events |
| `apps/api/prisma/migrations/20260817220227_add_inventory/migration.sql` | Inventario |

## 15. Notas Importantes

### Seguridad
- `keys/` contiene certificados privados — NUNCA versionar
- `.env` contiene secretos — NUNCA versionar
- `public/` contiene XMLs generados — NO versionar

### Zona Horaria
- La API usa `America/La_Paz` (UTC-4)
- Prisma envía/recibe UTC, frontend convierte a local
- Usar `bolivia-date.ts` para formato SIAT

### SIAT
- Event code `9890318` registrado en Pilot
- Solo 1 evento activo por punto de venta
- `.461` es literal fijo, no milisegundos
- Formato fecha SIAT: `yyyy-MM-ddTHH:mm:ss.SSS`
