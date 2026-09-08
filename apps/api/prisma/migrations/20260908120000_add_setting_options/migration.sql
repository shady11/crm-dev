-- CreateEnum
CREATE TYPE "SettingOptionType" AS ENUM ('CURRENCY', 'LOCALE', 'TIMEZONE');

-- CreateTable
CREATE TABLE "SettingOption" (
    "id" TEXT NOT NULL,
    "type" "SettingOptionType" NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettingOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SettingOption_type_code_key" ON "SettingOption"("type", "code");

-- Seed a starter set so the pickers this table backs are never empty,
-- including every value companies.service.ts's DEFAULTS constant can assign
-- to a newly created tenant (KGS / ru-RU / Asia/Bishkek).
INSERT INTO "SettingOption" ("id", "type", "code", "label", "updatedAt") VALUES
    (gen_random_uuid(), 'CURRENCY', 'KGS', 'Kyrgyzstani Som (KGS)', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'CURRENCY', 'USD', 'US Dollar (USD)', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'CURRENCY', 'EUR', 'Euro (EUR)', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'CURRENCY', 'RUB', 'Russian Ruble (RUB)', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'CURRENCY', 'KZT', 'Kazakhstani Tenge (KZT)', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'LOCALE', 'ru-RU', 'Russian (Russia)', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'LOCALE', 'en-US', 'English (United States)', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'LOCALE', 'ky-KG', 'Kyrgyz (Kyrgyzstan)', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'LOCALE', 'kk-KZ', 'Kazakh (Kazakhstan)', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TIMEZONE', 'Asia/Bishkek', 'Bishkek (UTC+6)', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TIMEZONE', 'Asia/Almaty', 'Almaty (UTC+6)', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TIMEZONE', 'Europe/Moscow', 'Moscow (UTC+3)', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TIMEZONE', 'UTC', 'UTC', CURRENT_TIMESTAMP);
