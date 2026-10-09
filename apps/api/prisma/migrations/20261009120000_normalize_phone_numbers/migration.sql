-- Store every phone number in one spelling (+996XXXXXXXXX for local numbers),
-- matching normalizePhone() in src/common/utils/phone.util.ts, which now runs
-- on every lead and client write. Without this backfill, a number entered as
-- "+996555123456" today would not match the same number saved earlier as
-- "0555 123 456", and the duplicate check would miss it.
--
-- Mirrors the util's rules exactly; anything else is left as typed.

CREATE FUNCTION pg_temp.normalize_phone(raw text) RETURNS text AS $$
DECLARE
    trimmed text := btrim(raw);
    digits  text := regexp_replace(raw, '\D', '', 'g');
BEGIN
    IF raw IS NULL THEN RETURN NULL; END IF;
    IF left(trimmed, 1) = '+' AND length(digits) >= 8 THEN RETURN '+' || digits; END IF;
    IF digits ~ '^996\d{9}$' THEN RETURN '+' || digits; END IF;
    IF digits ~ '^0\d{9}$' THEN RETURN '+996' || substr(digits, 2); END IF;
    IF digits ~ '^\d{9}$' THEN RETURN '+996' || digits; END IF;
    RETURN trimmed;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE "Lead" SET phone = pg_temp.normalize_phone(phone)
WHERE phone IS DISTINCT FROM pg_temp.normalize_phone(phone);

UPDATE "Client" SET phone = pg_temp.normalize_phone(phone)
WHERE phone IS DISTINCT FROM pg_temp.normalize_phone(phone);

UPDATE "Client" SET whatsapp = pg_temp.normalize_phone(whatsapp)
WHERE whatsapp IS NOT NULL AND whatsapp IS DISTINCT FROM pg_temp.normalize_phone(whatsapp);
