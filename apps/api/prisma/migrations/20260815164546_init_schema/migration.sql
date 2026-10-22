-- CreateTable
CREATE TABLE "company" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nit" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_company" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "environment_code" INTEGER NOT NULL,
    "modality_code" INTEGER NOT NULL,
    "system_code" TEXT NOT NULL,
    "archive_private_key" TEXT,
    "archive_public_key" TEXT,
    "email_siat" TEXT,
    "name_image" TEXT,
    "state" INTEGER NOT NULL DEFAULT 1,
    "type_print" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "token" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "start_date" TIMESTAMPTZ(3),
    "end_date" TIMESTAMPTZ(3),
    "value" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 2,
    "state" INTEGER NOT NULL DEFAULT 1,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3),
    CONSTRAINT "token_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "branch_office" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nit" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradename" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "city_taxes" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "web" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3),
    CONSTRAINT "branch_office_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "point_sale_type" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classifier_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "point_sale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "point_sale_code" INTEGER NOT NULL,
    "point_sale_name" TEXT NOT NULL,
    "description" TEXT,
    "point_sale_type_name" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "point_sale_type_id" INTEGER,
    "branch_office_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3),
    CONSTRAINT "point_sale_point_sale_type_id_fkey" FOREIGN KEY ("point_sale_type_id") REFERENCES "point_sale_type" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "point_sale_branch_office_id_fkey" FOREIGN KEY ("branch_office_id") REFERENCES "branch_office" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sector_document" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classifier_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "activity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "description" TEXT NOT NULL,
    "caeb_code" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "sector_document_activity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activity_code" TEXT NOT NULL,
    "sector_document_code" TEXT NOT NULL,
    "sector_document_type" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "activity_id" INTEGER NOT NULL,
    "sector_document_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3),
    CONSTRAINT "sector_document_activity_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sector_document_activity_sector_document_id_fkey" FOREIGN KEY ("sector_document_id") REFERENCES "sector_document" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "legend" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activity_code" TEXT NOT NULL,
    "legend_description" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "activity_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3),
    CONSTRAINT "legend_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "identity_document_type" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classifier_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "unit_measure" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classifier_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "payment_method_type" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classifier_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "currency" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classifier_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "reason_cancellation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classifier_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "type_invoice_document" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classifier_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "products_services" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "activity_code" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "product_description" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "activity_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3),
    CONSTRAINT "products_services_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "city" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "customer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" INTEGER NOT NULL,
    "nit" TEXT NOT NULL,
    "invoice_name" TEXT NOT NULL,
    "ci" TEXT,
    "name" TEXT,
    "complement" TEXT,
    "identity_document_type_code" TEXT,
    "phone1" TEXT,
    "phone2" TEXT,
    "address" TEXT,
    "email" TEXT,
    "birthday" TIMESTAMPTZ(3),
    "identity_document_type_id" INTEGER,
    "city_id" INTEGER NOT NULL,
    "synchronized" INTEGER NOT NULL DEFAULT 0,
    "state" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3),
    CONSTRAINT "customer_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "city" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "group" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "product_type" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "product_model" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "tradename" TEXT NOT NULL,
    "generic_name" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "cost_price" DECIMAL NOT NULL,
    "selling_price" DECIMAL NOT NULL,
    "wholesale_selling_price" DECIMAL NOT NULL,
    "percentage_aliquot" DECIMAL,
    "specific_aliquot" DECIMAL,
    "quantity_ice" DECIMAL,
    "value_ice" DECIMAL NOT NULL DEFAULT 1,
    "brand_ice" INTEGER NOT NULL DEFAULT 2,
    "minimum_stock" INTEGER NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "group_id" INTEGER NOT NULL,
    "product_model_id" INTEGER NOT NULL,
    "unit_measure_id" INTEGER NOT NULL,
    "product_type_id" INTEGER NOT NULL,
    "activity_id" INTEGER NOT NULL,
    "products_services_id" INTEGER NOT NULL,
    "setting_table_id" INTEGER NOT NULL DEFAULT 1,
    "user_id" INTEGER NOT NULL,
    "branch_office_id" INTEGER NOT NULL,
    "registration_date" TIMESTAMPTZ(3) NOT NULL,
    "modification_date" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "product_unit_measure_id_fkey" FOREIGN KEY ("unit_measure_id") REFERENCES "unit_measure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_products_services_id_fkey" FOREIGN KEY ("products_services_id") REFERENCES "products_services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_product_model_id_fkey" FOREIGN KEY ("product_model_id") REFERENCES "product_model" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sale_num" INTEGER NOT NULL,
    "sale_type" TEXT NOT NULL,
    "sale_date" TIMESTAMPTZ(3) NOT NULL,
    "subtotal" DECIMAL NOT NULL,
    "discount" DECIMAL NOT NULL,
    "total" DECIMAL NOT NULL,
    "synchronized" INTEGER NOT NULL DEFAULT 0,
    "state" INTEGER NOT NULL DEFAULT 1,
    "customer_id" INTEGER NOT NULL,
    "branch_office_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3),
    CONSTRAINT "sale_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sale_branch_office_id_fkey" FOREIGN KEY ("branch_office_id") REFERENCES "branch_office" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sale_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sale_detail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "cost_price" DECIMAL NOT NULL,
    "selling_price" DECIMAL NOT NULL,
    "subtotal" DECIMAL NOT NULL,
    "discount" DECIMAL NOT NULL,
    "total" DECIMAL,
    "activity_code" TEXT NOT NULL,
    "product_code_sin" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "unit_measure_classifier_code" TEXT NOT NULL,
    "serial_number" TEXT,
    "imei_number" TEXT,
    "state" INTEGER NOT NULL DEFAULT 1,
    "sale_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "products_services_id" INTEGER NOT NULL,
    "unit_measure_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3),
    CONSTRAINT "sale_detail_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoice_num" INTEGER NOT NULL,
    "invoice_num_format" TEXT,
    "invoice_date" TIMESTAMPTZ(3) NOT NULL,
    "invoice_date_format" TIMESTAMPTZ(3),
    "activity_num" TEXT NOT NULL,
    "code_customer" TEXT NOT NULL,
    "nit_customer" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_complement" TEXT,
    "identity_document_type_code" TEXT NOT NULL,
    "type_invoice_document_code" TEXT NOT NULL,
    "reason_cancellation_code" TEXT,
    "sector_document_code" TEXT,
    "payment_method_type_code" TEXT,
    "branch_office_code" TEXT,
    "point_sale_code" TEXT,
    "currency_code" TEXT,
    "reason_event_code" TEXT,
    "change_type" DECIMAL NOT NULL,
    "amount_not_subject_iva" DECIMAL NOT NULL,
    "exempt_operation" DECIMAL NOT NULL,
    "cero_rate_sale" DECIMAL NOT NULL,
    "subtotal" DECIMAL NOT NULL,
    "discount" DECIMAL NOT NULL,
    "total" DECIMAL NOT NULL,
    "gift_card_amount" DECIMAL NOT NULL DEFAULT 0,
    "total_to_pay" DECIMAL NOT NULL,
    "tax_credit_base_amount" DECIMAL NOT NULL,
    "iva" DECIMAL NOT NULL,
    "control_code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "legend_description" TEXT NOT NULL,
    "card_number" TEXT,
    "reception_code" TEXT,
    "emission_type" INTEGER NOT NULL DEFAULT 2,
    "synchronized_siat" INTEGER NOT NULL DEFAULT 2,
    "exception_code" INTEGER NOT NULL DEFAULT 0,
    "contingency" INTEGER,
    "cuis" TEXT,
    "cufd" TEXT,
    "cuf" TEXT,
    "cafc" TEXT,
    "transaction" BOOLEAN,
    "url_xml" TEXT,
    "state" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "activity_id" INTEGER NOT NULL,
    "identity_document_type_id" INTEGER NOT NULL,
    "type_invoice_document_id" INTEGER NOT NULL,
    "branch_office_id" INTEGER NOT NULL,
    "point_sale_id" INTEGER NOT NULL,
    "sector_document_id" INTEGER,
    "payment_method_type_id" INTEGER,
    "currency_id" INTEGER,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3),
    CONSTRAINT "invoice_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoice_branch_office_id_fkey" FOREIGN KEY ("branch_office_id") REFERENCES "branch_office" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoice_point_sale_id_fkey" FOREIGN KEY ("point_sale_id") REFERENCES "point_sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoice_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoice_sector_document_id_fkey" FOREIGN KEY ("sector_document_id") REFERENCES "sector_document" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invoice_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoice_detail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "cost_price" DECIMAL NOT NULL,
    "selling_price" DECIMAL NOT NULL,
    "subtotal" DECIMAL NOT NULL,
    "discount" DECIMAL NOT NULL,
    "total" DECIMAL,
    "activity_code" TEXT NOT NULL,
    "product_code_sin" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "unit_measure_classifier_code" TEXT NOT NULL,
    "serial_number" TEXT,
    "imei_number" TEXT,
    "state" INTEGER NOT NULL DEFAULT 1,
    "invoice_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "products_services_id" INTEGER NOT NULL,
    "unit_measure_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3),
    CONSTRAINT "invoice_detail_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoice_sale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoice_id" INTEGER NOT NULL,
    "sale_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3),
    CONSTRAINT "invoice_sale_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoice_sale_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cuis" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "start_date" TIMESTAMPTZ(3) NOT NULL,
    "effective_date" TIMESTAMPTZ(3) NOT NULL,
    "transaction" BOOLEAN NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "point_sale_id" INTEGER NOT NULL,
    "branch_office_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3),
    CONSTRAINT "cuis_point_sale_id_fkey" FOREIGN KEY ("point_sale_id") REFERENCES "point_sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cuis_branch_office_id_fkey" FOREIGN KEY ("branch_office_id") REFERENCES "branch_office" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cufd" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "control_code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "start_date" TIMESTAMPTZ(3) NOT NULL,
    "effective_date" TIMESTAMPTZ(3) NOT NULL,
    "effective_date2" TIMESTAMPTZ(3) NOT NULL,
    "effective_date3" TIMESTAMPTZ(3) NOT NULL,
    "transaction" BOOLEAN NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "state2" INTEGER NOT NULL DEFAULT 1,
    "state3" INTEGER NOT NULL DEFAULT 1,
    "cuis_id" INTEGER NOT NULL,
    "point_sale_id" INTEGER NOT NULL,
    "branch_office_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3),
    CONSTRAINT "cufd_cuis_id_fkey" FOREIGN KEY ("cuis_id") REFERENCES "cuis" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cufd_point_sale_id_fkey" FOREIGN KEY ("point_sale_id") REFERENCES "point_sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cufd_branch_office_id_fkey" FOREIGN KEY ("branch_office_id") REFERENCES "branch_office" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "role" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "permission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT,
    "action" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "user_role" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,

    PRIMARY KEY ("userId", "roleId"),
    CONSTRAINT "user_role_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_role_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "role_permission" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    PRIMARY KEY ("roleId", "permissionId"),
    CONSTRAINT "role_permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "role_permission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_permission" (
    "userId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    PRIMARY KEY ("userId", "permissionId"),
    CONSTRAINT "user_permission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_permission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permission_name_key" ON "permission"("name");

-- CreateIndex
CREATE INDEX "user_role_roleId_idx" ON "user_role"("roleId");

-- CreateIndex
CREATE INDEX "role_permission_permissionId_idx" ON "role_permission"("permissionId");

-- CreateIndex
CREATE INDEX "user_permission_permissionId_idx" ON "user_permission"("permissionId");
