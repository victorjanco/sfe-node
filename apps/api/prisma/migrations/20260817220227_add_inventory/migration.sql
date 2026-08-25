-- CreateTable
CREATE TABLE "warehouse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "state" INTEGER NOT NULL DEFAULT 1,
    "branch_office_id" INTEGER NOT NULL,
    "created_at" DATETIME,
    "updated_at" DATETIME,
    CONSTRAINT "warehouse_branch_office_id_fkey" FOREIGN KEY ("branch_office_id") REFERENCES "branch_office" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quantity" DECIMAL NOT NULL DEFAULT 0,
    "available_quantity" DECIMAL NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL NOT NULL DEFAULT 0,
    "state" INTEGER NOT NULL DEFAULT 1,
    "product_id" INTEGER NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "created_at" DATETIME,
    "updated_at" DATETIME,
    CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_entry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entry_type" TEXT NOT NULL,
    "reference" TEXT,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "state" INTEGER NOT NULL DEFAULT 1,
    "warehouse_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME,
    "updated_at" DATETIME,
    CONSTRAINT "inventory_entry_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_entry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_entry_detail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quantity" DECIMAL NOT NULL,
    "cost_price" DECIMAL NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "entry_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "unit_measure_id" INTEGER NOT NULL,
    "created_at" DATETIME,
    "updated_at" DATETIME,
    CONSTRAINT "inventory_entry_detail_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "inventory_entry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_entry_detail_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_entry_detail_unit_measure_id_fkey" FOREIGN KEY ("unit_measure_id") REFERENCES "unit_measure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_exit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "exit_type" TEXT NOT NULL,
    "reference" TEXT,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "state" INTEGER NOT NULL DEFAULT 1,
    "warehouse_id" INTEGER NOT NULL,
    "sale_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME,
    "updated_at" DATETIME,
    CONSTRAINT "inventory_exit_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_exit_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "inventory_exit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_exit_detail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quantity" DECIMAL NOT NULL,
    "cost_price" DECIMAL NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "exit_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "unit_measure_id" INTEGER NOT NULL,
    "created_at" DATETIME,
    "updated_at" DATETIME,
    CONSTRAINT "inventory_exit_detail_exit_id_fkey" FOREIGN KEY ("exit_id") REFERENCES "inventory_exit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_exit_detail_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_exit_detail_unit_measure_id_fkey" FOREIGN KEY ("unit_measure_id") REFERENCES "unit_measure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_movement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "movement_type" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit_cost" DECIMAL NOT NULL,
    "stock_after" DECIMAL NOT NULL,
    "reference_type" TEXT,
    "reference_id" INTEGER,
    "state" INTEGER NOT NULL DEFAULT 1,
    "product_id" INTEGER NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME,
    "updated_at" DATETIME,
    CONSTRAINT "inventory_movement_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_movement_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_movement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_product" (
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
    "is_stock_controlled" BOOLEAN NOT NULL DEFAULT false,
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
    "registration_date" DATETIME NOT NULL,
    "modification_date" DATETIME NOT NULL,
    CONSTRAINT "product_unit_measure_id_fkey" FOREIGN KEY ("unit_measure_id") REFERENCES "unit_measure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_products_services_id_fkey" FOREIGN KEY ("products_services_id") REFERENCES "products_services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_product_model_id_fkey" FOREIGN KEY ("product_model_id") REFERENCES "product_model" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_product" ("activity_id", "branch_office_id", "brand_ice", "code", "cost_price", "dimension", "generic_name", "group_id", "id", "minimum_stock", "modification_date", "percentage_aliquot", "product_model_id", "product_type_id", "products_services_id", "quantity_ice", "registration_date", "selling_price", "setting_table_id", "specific_aliquot", "state", "tradename", "unit_measure_id", "user_id", "value_ice", "wholesale_selling_price") SELECT "activity_id", "branch_office_id", "brand_ice", "code", "cost_price", "dimension", "generic_name", "group_id", "id", "minimum_stock", "modification_date", "percentage_aliquot", "product_model_id", "product_type_id", "products_services_id", "quantity_ice", "registration_date", "selling_price", "setting_table_id", "specific_aliquot", "state", "tradename", "unit_measure_id", "user_id", "value_ice", "wholesale_selling_price" FROM "product";
DROP TABLE "product";
ALTER TABLE "new_product" RENAME TO "product";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "warehouse_branch_office_id_idx" ON "warehouse"("branch_office_id");

-- CreateIndex
CREATE INDEX "inventory_warehouse_id_idx" ON "inventory"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_product_id_warehouse_id_key" ON "inventory"("product_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "inventory_entry_warehouse_id_idx" ON "inventory_entry"("warehouse_id");

-- CreateIndex
CREATE INDEX "inventory_entry_entry_type_idx" ON "inventory_entry"("entry_type");

-- CreateIndex
CREATE INDEX "inventory_entry_detail_entry_id_idx" ON "inventory_entry_detail"("entry_id");

-- CreateIndex
CREATE INDEX "inventory_entry_detail_product_id_idx" ON "inventory_entry_detail"("product_id");

-- CreateIndex
CREATE INDEX "inventory_exit_warehouse_id_idx" ON "inventory_exit"("warehouse_id");

-- CreateIndex
CREATE INDEX "inventory_exit_exit_type_idx" ON "inventory_exit"("exit_type");

-- CreateIndex
CREATE INDEX "inventory_exit_sale_id_idx" ON "inventory_exit"("sale_id");

-- CreateIndex
CREATE INDEX "inventory_exit_detail_exit_id_idx" ON "inventory_exit_detail"("exit_id");

-- CreateIndex
CREATE INDEX "inventory_exit_detail_product_id_idx" ON "inventory_exit_detail"("product_id");

-- CreateIndex
CREATE INDEX "inventory_movement_product_id_idx" ON "inventory_movement"("product_id");

-- CreateIndex
CREATE INDEX "inventory_movement_warehouse_id_idx" ON "inventory_movement"("warehouse_id");

-- CreateIndex
CREATE INDEX "inventory_movement_movement_type_idx" ON "inventory_movement"("movement_type");

-- CreateIndex
CREATE INDEX "inventory_movement_reference_type_reference_id_idx" ON "inventory_movement"("reference_type", "reference_id");
