# SFE Node — Sistema de Facturación Electrónica

Port del sistema **SFE Facturación IC** (Laravel 5.7 + Vue 2) a **NestJS + React + Prisma**. Monorepo con npm workspaces.
Incluye algoritmos SIAT validados 1:1 contra el PHP original, venta Compra-Venta end-to-end, SOAP real contra SIN Piloto,
PDF de facturas/notas, inventario con kardex, reportes con exportación Excel y panel de administración.

La documentación de origen de la migración vive en `C:\laragon\www\sfe-facturacion-ic\docs-migracion\`.

---

## Estructura

```
sfe-node/
├── apps/
│   ├── api/              # Backend NestJS (prefijo /api)
│   │   ├── prisma/       # Schema, migraciones y seed (SQLite / PostgreSQL)
│   │   ├── keys/         # Certificados SIAT (certificado.pem + claveprivadakey.pem)
│   │   ├── scripts/      # Utilidades de sync / diagnóstico
│   │   └── src/
│   │       ├── common/   # Constantes SIAT y decoradores
│   │       ├── prisma/   # PrismaModule global
│   │       └── modules/  # 14 módulos Nest (auth, sale, siat, inventory, …)
│   └── web/              # Frontend React 18 + Vite (proxy /api → :3000)
│       └── src/
│           ├── api/      # Axios client con Bearer JWT
│           ├── components/# 28 vistas: venta, inventario, SIAT, admin, reportes…
│           └── context/  # AuthContext con roles + permisos
└── packages/
    └── sfe-core/         # Algoritmos SIAT portados y validados con tests de oro
```

Volumen estimado (agosto 2026): **~14.000 líneas TS/TSX** (excluyendo dist y node_modules).

| Workspace     | Archivos | Líneas | Rol |
|---            |---       |---     |---  |
| `@sfe/api`    | ~67      | ~6.772 | Backend NestJS: Prisma, 14 módulos, SOAP SIAT |
| `@sfe/web`    | ~33      | ~6.417 | Frontend React: 28 vistas, auth JWT, permisos |
| `@sfe/core`   | ~8       | ~756   | Núcleo fiscal: Verhoeff, RC4, CUF, EnLetras, Base64SIN |

---

## Requisitos

- Node.js **20+**
- npm 9+ (usa workspaces nativos)
- (Opcional) PostgreSQL 14+ para producción — el demo funciona con SQLite sin servidor
- (Opcional) Chrome/Chromium para el generador de PDF con Puppeteer

---

## Instalación rápida (demo local)

```bash
# 1. Clonar / ubicarse en el repo
cd sfe-node

# 2. Instalar todas las dependencias (incluye @sfe/core, api y web)
npm install

# 3. Preparar la base de datos (SQLite demo) + datos semilla
npm run build                                # compila @sfe/core (requisito)
npm run prisma:generate -w @sfe/api          # genera Prisma Client
npm run prisma:push -w @sfe/api              # crea apps/api/prisma/dev.db
npm run db:seed -w @sfe/api                  # empresa, catálogos SIAT, CUIS/CUFD, usuarios…

# 4. Copiar entorno base y JWT
cp apps/api/.env.example apps/api/.env
# .env ya contiene JWT_SECRET y SIAT_ENABLED=false por defecto (modo demo)
```

### Levantar el stack

Terminal 1 — API NestJS (http://localhost:3000/api):
```bash
npm run dev:api
```

Terminal 2 — Frontend React (http://localhost:5173):
```bash
npm run dev:web
```

Swagger UI (habilitado por defecto en ambiente 2/pruebas): **http://localhost:3000/api/docs**

---

## Comandos (por workspace)

### Raíz del monorepo (`package.json`)

| Comando            | Qué hace |
|---                 |---       |
| `npm install`      | Instala los 3 workspaces y enlaza `@sfe/core` como dependencia local |
| `npm run build`    | Compila `@sfe/core` (requisito antes de levantar api o web) |
| `npm run test`     | Tests de oro en `@sfe/core` + tests unitarios `@sfe/api` |
| `npm run dev:api`  | `nest start --watch` en `apps/api` (puerto 3000) |
| `npm run dev:web`  | `vite` en `apps/web` (puerto 5173, proxy /api → :3000) |

### Backend `apps/api` (`@sfe/api`)

Ejecutar con `-w @sfe/api` o entrando al directorio:

| Comando               | Qué hace |
|---                    |---       |
| `prisma:generate`     | `prisma generate` a partir de `prisma/schema.prisma` |
| `prisma:push`         | `prisma db push` — sincroniza BD (SQLite demo) |
| `db:seed`             | Seed con `tsx prisma/seed.ts` |
| `start:dev`           | Nest en modo watch |
| `start`               | Ejecuta compilado `dist-build/main.js` |
| `build`               | `nest build` → `dist-build/` |
| `test`                | `vitest run` — firma XML, cliente SOAP y lógica de inventario |

Script de deploy para Windows: **`apps/api/deploy-migrate.bat`** → `prisma migrate deploy` (para producción con migraciones).

### Frontend `apps/web` (`@sfe/web`)

| Comando         | Qué hace |
|---              |---       |
| `dev`           | Vite dev server en :5173 |
| `build`         | `tsc -b && vite build` (compila @sfe/core antes) |
| `preview`       | Sirve `dist/` |

### Core `packages/sfe-core` (`@sfe/core`)

| Comando | Qué hace |
|---      |---       |
| `build` | Compila TS → `dist/index.js` (CJS compatible con Vite/Nest) |
| `test`  | Tests de oro vs el PHP original: Verhoeff, RC4, Base64SIN, CUF, EnLetras, Código de Control |

---

## Configuración del entorno (`apps/api/.env`)

Copiar desde `apps/api/.env.example`. Valores clave:

```bash
# ===== Servidor =====
PORT=3000
# CORS_ORIGIN="https://sfe.example.bo,https://panel.example.bo"   # producción

# ===== Base de datos =====
DATABASE_URL="file:./dev.db"                      # demo local
# DATABASE_URL="postgresql://sfe:sfe@localhost:5432/sfe?schema=public"  # producción

# ===== JWT (OBLIGATORIO, sin fallback) =====
# Generar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=cambiar-esto-por-un-secreto-largo-y-aleatorio
JWT_EXPIRES_IN=24h

# ===== Integración SIAT =====
# MODO DEMO (por defecto):  SIAT_ENABLED=false  → stubs locales REC-*
# MODO PILOTO / REAL:        SIAT_ENABLED=true   → SOAP contra pilotosiatservicios
SIAT_ENABLED=false
SIAT_BASE_URL="https://pilotosiatservicios.impuestos.gob.bo/v2"
SIAT_TOKEN="TokenApi-xxx"
SIAT_AMBIENTE=2        # 1=Producción, 2=Pruebas (piloto)
SIAT_MODALIDAD=1       # 1=Electrónica en línea, 2=Computarizada fuera de línea
SIAT_SISTEMA="CODIGO-SISTEMA-SIN"
SIAT_NIT="1234567890123"
SIAT_RAZON_SOCIAL="EMPRESA EJEMPLO S.R.L."
# SIAT_KEYS_DIR=./apps/api/keys     # directorio con certificado.pem y claveprivadakey.pem

# ===== Swagger =====
# Por defecto: activo en SIAT_AMBIENTE != 1, desactivado en producción.
# Forzar: SWAGGER_ENABLED=true
```

### Cómo activar SOAP real contra SIN Piloto

1. Poner `SIAT_ENABLED=true`
2. Configurar `SIAT_TOKEN` (token delegado V2 del SIN), `SIAT_NIT`, `SIAT_SISTEMA`, `SIAT_RAZON_SOCIAL`
3. Colocar los certificados en `apps/api/keys/`:
   - `certificado.pem` (clave pública)
   - `claveprivadakey.pem` (clave privada, sin passphrase o con una conocida)
   - Alternativa: setear `SIAT_PUBLIC_KEY` y `SIAT_PRIVATE_KEY` con el contenido en una sola línea (`\n` como salto)
4. En el frontend, ir a la pantalla **SIAT** y sincronizar **CUIS** y **CUFD** por sucursal / punto de venta
5. Emitir una factura desde **Venta** — el `recepcionFactura` ahora se envía por SOAP real y devuelve el `codigoRecepcion` del SIN

Nota: en modo demo (`SIAT_ENABLED=false`) se emiten stubs locales con prefijo `REC-` y transacción=true, ideal para
desarrollar UI / inventario sin depender del piloto.

---

## Seguridad: JWT + CASL (global)

A diferencia de fases iniciales, **toda la API está protegida** (ver [app.module.ts](file:///c:/laragon/www/sfe-node/apps/api/src/app.module.ts#L44-L51)):

- `JwtAuthGuard` registrado como `APP_GUARD` → todas las rutas requieren Bearer JWT, excepto aquellas marcadas con `@Public()` (ej. `/api/auth/login`, `/api/health`)
- `CaslGuard` también global → cada controlador declara el permiso requerido mediante `@CheckAbility({ action, subject })`
- `JWT_SECRET` es **obligatorio** (sin fallback en claro); ver [auth.config.ts](file:///c:/laragon/www/sfe-node/apps/api/src/modules/auth/auth.config.ts#L1-L16). En producción falla el arranque si no está definido.

### Permisos CASL disponibles (seed)

| Módulo         | Permisos |
|---             |---       |
| Usuarios       | `users.read/create/update/delete` |
| Roles          | `roles.read/create/update/delete` |
| Permisos       | `permissions.read/create/update/delete` |
| Ventas         | `sales.read/create/update/delete` |
| Notas de venta | `note_sales.read`, `note_sales.manage` |
| Inventario     | `inventory_entry`, `inventory_exit`, `inventory_product`, `inventory_warehouse`, `inventory_kardex`, `inventory_balance` |
| Productos      | `product.read` |
| Reportes       | `reports.read`, `reports.export` |
| SIAT           | `siat.read`, `siat.manage` |
| Sistema        | `system.full_access` |

### Roles iniciales

| Rol          | Alcance |
|---           |---      |
| SUPER_ADMIN  | todos los permisos + `system.full_access` |
| ADMIN        | gestión usuarios/roles, ventas, inventario, SIAT, reportes |
| MANAGER      | ventas, inventario, reportes |
| USER         | venta, lectura de inventario y reportes |

### Usuarios demo (seed)

Contraseña para **todos**: `password`

| Usuario      | Rol         |
|---           |---          |
| `admin`      | SUPER_ADMIN |
| `gerente`    | ADMIN       |
| `vendedor`   | MANAGER     |
| `usuario`    | USER        |

---

## Módulos Nest (14)

| Módulo             | Archivo raíz | Rutas base | Descripción |
|---                 |---           |---         |---          |
| Auth               | [auth.module.ts](file:///c:/laragon/www/sfe-node/apps/api/src/modules/auth/auth.module.ts) | `/api/auth/*` | `login`, `register`, `me` — emite y valida JWT |
| Authorization      | [authorization.module.ts](file:///c:/laragon/www/sfe-node/apps/api/src/modules/authorization/authorization.module.ts) | — | CASL AbilityFactory + CaslGuard + decorador `@CheckAbility` |
| Users / Roles / Permissions | módulos independientes | `/api/users`, `/api/roles`, `/api/permissions` | CRUD + asignación |
| Sale               | [sale.module.ts](file:///c:/laragon/www/sfe-node/apps/api/src/modules/sale/sale.module.ts) | `/api/sale/*` | Venta FCV, notas, reportes y export XLSX |
| Inventory          | [inventory.module.ts](file:///c:/laragon/www/sfe-node/apps/api/src/modules/inventory/inventory.module.ts) | `/api/inventory/*` | Almacenes, ingresos/salidas, kardex, balance |
| Siat               | [siat.module.ts](file:///c:/laragon/www/sfe-node/apps/api/src/modules/siat/siat.module.ts) | `/api/siat/*` | Sincronización CUIS/CUFD, catálogos, cliente SOAP |
| CatalogSiat        | [catalog-siat.module.ts](file:///c:/laragon/www/sfe-node/apps/api/src/modules/catalog-siat/catalog-siat.module.ts) | `/api/:cat/get_list_enabled` | Catálogos estáticos SIAT (actividades, productos, leyendas, monedas…) |
| Company            | [company.module.ts](file:///c:/laragon/www/sfe-node/apps/api/src/modules/company/company.module.ts) | `/api/company`, `/api/branch-offices`, `/api/point-sales`, `/api/tokens` | Empresa / sucursales / PDV / tokens |
| Customer / Product | módulos independientes | `/api/customer`, `/api/product` | Catálogos |
| Facturas (PDF)     | [facturas.module.ts](file:///c:/laragon/www/sfe-node/apps/api/src/modules/facturas/facturas.module.ts) | `/api/facturas/:id/pdf` | Puppeteer + plantillas carta/rollo para factura y nota |
| SystemConfig       | [system-config.module.ts](file:///c:/laragon/www/sfe-node/apps/api/src/modules/system-config/system-config.module.ts) | `/api/system/*` | Panel Admin: estadísticas, entorno, usuarios, SIAT |

### Seguridad por ruta (superficie HTTP)

Todas las rutas de negocio usan `JwtAuthGuard` + `@CheckAbility`:

| Recurso                      | JWT | CASL           |
|---                           |---  |---             |
| `/api/auth/login|register`   | No (público) | — |
| `/api/auth/me`               | Sí  | `users.read` sobre sí mismo |
| `/api/users|roles|permissions` | Sí | `users.*`, `roles.*`, `permissions.*` |
| `/api/sale/store`            | Sí  | `sales.create` |
| `/api/sale` (listado)        | Sí  | `sales.read` |
| `/api/sale/export` (XLSX)    | Sí  | `reports.read` |
| `/api/sale/notes|store_note` | Sí  | `note_sales.*` |
| `/api/inventory/*`           | Sí  | granular (entry/exit/warehouse/kardex/balance/product) |
| `/api/siat/*`                | Sí  | `siat.read/manage` |
| `/api/customer|product|company|catalog/*` | Sí | `product.read`, `system.full_access`… |
| `/api/facturas/:id/pdf`      | Sí  | `sales.read` |
| `/api/system/*`              | Sí  | `system.full_access` |
| `/api/health`                | No  | — |

---

## Núcleo fiscal `@sfe/core`

Algoritmos portados **1:1 desde el PHP original** con tests de oro que validan idéntica salida:

| Archivo                          | Exporta              | Uso |
|---                               |---                   |---  |
| [verhoeff.ts](file:///c:/laragon/www/sfe-node/packages/sfe-core/src/algorithms/verhoeff.ts) | `verhoeffCheckDigit`, `verhoeffValidate` | Dígito verificador NIT, CUF |
| [rc4.ts](file:///c:/laragon/www/sfe-node/packages/sfe-core/src/algorithms/rc4.ts)           | `allegedRC4`         | Código de Control CUFD |
| [base64sin.ts](file:///c:/laragon/www/sfe-node/packages/sfe-core/src/algorithms/base64sin.ts) | `base64sinEncode`    | Variante SIAT de Base64 |
| [controlCode.ts](file:///c:/laragon/www/sfe-node/packages/sfe-core/src/algorithms/controlCode.ts) | `codigoControl`      | Código de Control (método 5 pasos SIN) |
| [enLetras.ts](file:///c:/laragon/www/sfe-node/packages/sfe-core/src/algorithms/enLetras.ts) | `enLetras`           | Monto en literal (BOB, 2 decimales) |
| [cuf.ts](file:///c:/laragon/www/sfe-node/packages/sfe-core/src/algorithms/cuf.ts)           | `procesoCuf`         | Generación CUF (Mod11 + Base16 + CUFD) |

Contrato de confianza: `npm run test -w @sfe/core` compara salida con vectores conocidos del PHP.

---

## Flujo de una Factura Compra-Venta (`POST /api/sale/store`)

Implementado en [sale.service.ts](file:///c:/laragon/www/sfe-node/apps/api/src/modules/sale/sale.service.ts).
**Venta y stock se ejecutan en la misma transacción Prisma** para mantener consistencia.

| Paso | Descripción |
|---   |---          |
| 1. Validación | `total > 0`, sucursal y punto de venta existentes, CUIS/CUFD vigentes, leyenda de impuestos |
| 2. Cliente | NIT + nombre o excepciones SIAT (`99001` extranjero, `99002` PF sin NIT, `99003` ventas menores) |
| 3. Numeración | Reserva y asigna `saleNum` e `invoiceNum` por sucursal / punto de venta (transaccional) |
| 4. CUF | `procesoCuf()` de `@sfe/core`: NIT + fecha + sucursal + modalidad + tipo + número + CUFD |
| 5. Stock | Si `inventory=1`, valida stock disponible por almacén y registra salidas; falla la venta si no alcanza |
| 6. XML | Arma `facturaComputarizadaCompraVenta` con detalle, impuestos, CUF, código de control; **firma XML** si `SIAT_ENABLED` |
| 7. Envío SIAT | gzip + sha256 del archivo. Si `SIAT_ENABLED=true` → SOAP `recepcionFactura` real; si no → stub `REC-*` |
| 8. Persistencia | Guarda `Sale`, `SaleDetail`, `Invoice`, `InvoiceSale` + respuesta SIAT (códigoRecepcion, mensajes…) |

Respuesta exitosa incluye `{ sale, invoice, cuf, codigoRecepcion, siatState }`.

### Generación PDF (factura / nota)

`GET /api/facturas/:id/pdf` — usa Puppeteer y plantillas HTML en `apps/api/src/modules/facturas/templates/`:
- **carta-factura.ts** / **ticket-factura.ts** (factura A4 / rollo 80mm)
- **nota-carta.ts** / **nota-rollo.ts** (nota de venta sin validez fiscal)

Devuelve `application/pdf` con attachment.

---

## Reportes + exportación Excel

### Endpoints

| Método | Ruta                | Permiso CASL    | Descripción |
|---     |---                  |---              |---          |
| GET    | `/api/sale`         | `sales.read`    | Listado de ventas filtrado |
| GET    | `/api/sale/export`  | `reports.read`  | Descarga `reporte-ventas-YYYY-MM-DD.xlsx` |

### Filtros reales (query params, SaleQueryDto)

```
date_from=2026-08-01     # fecha de emisión (desde)
date_to=2026-08-31       # fecha de emisión (hasta)
branch_office_id=1       # sucursal
point_sale_id=1          # punto de venta
state=V                  # V=Válida, A=Anulada, R=Rectificada
customer_id=             # cliente
invoice_num=             # número de factura
nit=                     # búsqueda parcial por NIT
page=1&per_page=50       # paginación
```

Respuesta incluye:
```json
{
  "data": [...],
  "total": 128,
  "page": 1,
  "per_page": 50,
  "_sum": { "total": 45230.50, "iva": 5879.96, "subtotal": 39350.54 },
  "totals": { "count": 128, "sumTotal": 45230.50, "sumIva": 5879.96, "sumSubtotal": 39350.54 }
}
```

### Exportación XLSX

Usa **ExcelJS**. Genera:
- Hoja `Ventas` con columnas: Fecha, N°, NIT, Cliente, Sucursal, PDV, Estado, Moneda, Subtotal, IVA, Total, CUF
- **Fila de totales** con fórmulas `=SUM()`, filtros auto aplicados y anchos de columna ajustados
- Encabezado con rango de fechas y nombre de la empresa

Frontend: vistas [Reports.tsx](file:///c:/laragon/www/sfe-node/apps/web/src/components/Reports.tsx) y
[ExportReports.tsx](file:///c:/laragon/www/sfe-node/apps/web/src/components/ExportReports.tsx).

---

## Panel de Administración y Configuración

Ruta: `/admin/config` (frontend) + `GET /api/system/overview` (API). Requiere `system.full_access`.
7 pestañas funcionales:

| Pestaña            | Qué muestra / permite |
|---                 |---   |
| **Resumen**        | Estadísticas en vivo: clientes, productos, ventas, facturas, valor de inventario, última venta |
| **Empresa**        | Datos de empresa, sucursales y puntos de venta |
| **Tokens SIAT**    | Historial de tokens delegados V2, vigencia |
| **Usuarios**       | Listado con roles y permisos asignados, editar usuario |
| **Roles**          | CRUD roles y asignación de permisos |
| **Entorno SIAT**   | `SIAT_ENABLED`, ambiente, modalidad, URL base, estado CUIS/CUFD por sucursal |
| **Diagnósticos**   | Verifica variables de entorno, conexión a BD, certificados en `keys/`, token SIAT, JWT_SECRET presente |

Endpoint de resumen: [system-config.service.ts](file:///c:/laragon/www/sfe-node/apps/api/src/modules/system-config/system-config.service.ts#L12-L80).

---

## Frontend React (estado: **usable**, no en construcción)

Vite dev server en `:5173` con proxy `/api` → `localhost:3000` (ver [vite.config.ts](file:///c:/laragon/www/sfe-node/apps/web/vite.config.ts#L15-L27)).
Sin CORS en desarrollo; configurar `CORS_ORIGIN` en producción.

### Rutas y vistas (28 componentes)

Todas las rutas protegidas pasan por `ProtectedRoute` + `CheckPermission` (client-side, CASL del servidor es la fuente de verdad).

| Grupo              | Ruta                      | Componente | Permiso mínimo |
|---                 |---                        |---         |---             |
| Auth               | `/login`                  | Login | público |
| **Venta**          | `/venta`                  | SaleForm | `sales.create` |
|                    | `/ventas`                 | SalesList | `sales.read` |
|                    | `/nota-venta`             | NoteSaleForm | `note_sales.manage` |
|                    | `/notas-venta`            | NotesList | `note_sales.read` |
| **Inventario**     | `/inventario/productos`   | ProductsList | `inventory_product` |
|                    | `/inventario/stock`       | InventoryList | `inventory_product` |
|                    | `/inventario/kardex`      | Kardex | `inventory_kardex` |
|                    | `/inventario/ingresos`    | InventoryMovementForm (entry) | `inventory_entry` |
|                    | `/inventario/salidas`     | InventoryMovementForm (exit) | `inventory_exit` |
|                    | `/inventario/almacenes`   | WarehousesList | `inventory_warehouse` |
|                    | `/inventario/balance`     | BalanceList | `inventory_balance` |
| Clientes           | `/clientes`               | CustomersList | `users.read` |
| **Reportes**       | `/reportes/ventas`        | Reports | `reports.read` |
|                    | `/reportes/exportar`      | ExportReports | `reports.export` |
| **Admin**          | `/admin/usuarios`         | UsersList | `users.read` |
|                    | `/admin/usuarios/nuevo`   | UserEdit | `users.create` |
|                    | `/admin/usuarios/:id/editar` | UserEdit | `users.update` |
|                    | `/admin/roles`            | RolesList | `roles.read` |
|                    | `/admin/permisos`         | PermissionsList | `permissions.read` |
|                    | `/admin/config`           | AdminConfig | `system.full_access` |
| **SIAT**           | `/siat`                   | SiatModule | `system.full_access` |

### Sidebar

[Sidebar.tsx](file:///c:/laragon/www/sfe-node/apps/web/src/components/Sidebar.tsx) renderiza ítems según los
permisos del usuario en `AuthContext`.

---

## Swagger / OpenAPI UI

**Ya cableado** en [main.ts](file:///c:/laragon/www/sfe-node/apps/api/src/main.ts#L36-L87).

- **URL**: `http://localhost:3000/api/docs`
- **Autenticación**: Bearer JWT (botón "Authorize" arriba a la derecha)
- **Tags**: auth, users, roles, permissions, sale, inventory, siat, company, system
- **Control por ambiente**:
  - Si `SIAT_AMBIENTE=1` (producción) → Swagger **desactivado** por defecto
  - Si `SIAT_AMBIENTE=2` (pruebas/piloto) → Swagger **activado**
  - Forzar con `SWAGGER_ENABLED=true/false` en `.env`

---

## Pendientes / Roadmap

Lo que sigue después de esta fase:

| # | Área | Estado |
|---|---|---|
| 1 | Restaurar / versionar `schema.prisma` completo (actualmente se apoya en el client generado) | pendiente |
| 2 | Plan de BD PostgreSQL: `prisma migrate` + numeración de facturas con transacciones serializables | pendiente |
| 3 | CAFC, contingencia, anulación SIAT (documento ajuste), otros sectores (alquiler, zona franca, ICE, educativo) | pendiente |
| 4 | Backups automáticos y retención de XML/CUF a largo plazo | pendiente |
| 5 | Auditoría de cambios (histórico de usuarios, ventas anuladas, movimientos de inventario) | pendiente |
| 6 | Pruebas E2E del flujo completo (login → venta → PDF → recepción SIAT) | pendiente |

---

## Qué está bien hecho / contratos de confianza

- ✅ **Tests de oro `@sfe/core`** contra el PHP original (Verhoeff, RC4, CUF, control code, EnLetras, Base64SIN)
- ✅ **`SIAT_ENABLED`** separa demo local de SOAP piloto — mismo flujo de negocio, stub vs cliente SOAP real
- ✅ **Certificados** en `apps/api/keys/` están en `.gitignore`; firma XML + gzip/sha256 alineados con protocolo SIAT v2
- ✅ **Venta + stock** en la misma transacción Prisma (ningún descuento sin persistencia confirmada)
- ✅ **`SiatModule` y `PrismaModule`** son `@Global()` — disponible en cualquier módulo sin importar
- ✅ **`JwtAuthGuard` global** excepto rutas `@Public()`; `CaslGuard` granular por permiso
- ✅ **`JWT_SECRET` obligatorio** (sin fallback) — falla el arranque si no está
- ✅ **Reportes con filtros reales** (date_from/date_to, sucursal, PDV, estado…) y export XLSX con fórmulas
- ✅ **Admin/Config** con 7 pestañas funcionales (resumen, empresa, tokens, usuarios, roles, SIAT, diagnósticos)
- ✅ **Swagger UI** cableado y listo para QA / integración
