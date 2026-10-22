-- CreateTable
CREATE TABLE "reason_event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classifier_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateTable
CREATE TABLE "change_type" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "classifier_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3)
);

-- CreateIndex
CREATE UNIQUE INDEX "reason_event_classifier_code_key" ON "reason_event"("classifier_code");

-- CreateIndex
CREATE UNIQUE INDEX "change_type_classifier_code_key" ON "change_type"("classifier_code");
