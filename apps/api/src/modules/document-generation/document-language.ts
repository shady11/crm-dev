import { Prisma } from '@/generated/prisma/client';

/**
 * E2E-3: the language a company's documents are written in, from its locale
 * (Company.locale, e.g. "ru-RU", "ky-KG"). Picks the built-in template and
 * how values are printed in it. Anything that isn't Russian or Kyrgyz gets
 * English, as before.
 */
export type DocumentLanguage = 'en' | 'ru' | 'ky';

export function documentLanguage(locale?: string | null): DocumentLanguage {
  const language = (locale ?? '').toLowerCase().split(/[-_]/)[0];
  return language === 'ru' || language === 'ky' ? language : 'en';
}

// The same words the app uses on screen for these values.
const LABELS: Record<
  DocumentLanguage,
  {
    unitType: Record<string, string>;
    financing: Record<string, string>;
    paymentMethod: Record<string, string>;
    paymentType: Record<string, string>;
  }
> = {
  en: {
    unitType: {
      APARTMENT: 'Apartment',
      COMMERCIAL: 'Commercial',
      PARKING: 'Parking',
      STORAGE: 'Storage',
    },
    financing: {
      CASH: 'Cash',
      INSTALLMENT: 'Installments',
      MORTGAGE: 'Mortgage',
    },
    paymentMethod: {
      CASH: 'Cash',
      BANK_TRANSFER: 'Bank transfer',
      MBANK: 'MBank',
      OPTIMA: 'Optima',
      ELKART: 'Elkart',
      OTHER: 'Other',
    },
    paymentType: {
      DEPOSIT: 'Deposit',
      INSTALLMENT: 'Installment',
      FINAL: 'Final payment',
      REFUND: 'Refund',
    },
  },
  ru: {
    unitType: {
      APARTMENT: 'Квартира',
      COMMERCIAL: 'Коммерческое помещение',
      PARKING: 'Паркинг',
      STORAGE: 'Кладовка',
    },
    financing: {
      CASH: 'Полная оплата',
      INSTALLMENT: 'Рассрочка',
      MORTGAGE: 'Ипотека',
    },
    paymentMethod: {
      CASH: 'Наличные',
      BANK_TRANSFER: 'Банковский перевод',
      MBANK: 'MBank',
      OPTIMA: 'Optima',
      ELKART: 'Элкарт',
      OTHER: 'Другое',
    },
    paymentType: {
      DEPOSIT: 'Задаток',
      INSTALLMENT: 'Рассрочка',
      FINAL: 'Финальный платёж',
      REFUND: 'Возврат',
    },
  },
  ky: {
    unitType: {
      APARTMENT: 'Квартира',
      COMMERCIAL: 'Коммерциялык жай',
      PARKING: 'Унаа токтотуучу жай',
      STORAGE: 'Кампа',
    },
    financing: {
      CASH: 'Толук төлөм',
      INSTALLMENT: 'Бөлүп төлөө',
      MORTGAGE: 'Ипотека',
    },
    paymentMethod: {
      CASH: 'Накталай',
      BANK_TRANSFER: 'Банктык которуу',
      MBANK: 'MBank',
      OPTIMA: 'Optima',
      ELKART: 'Элкарт',
      OTHER: 'Башка',
    },
    paymentType: {
      DEPOSIT: 'Күрөө акы',
      INSTALLMENT: 'Бөлүп төлөө',
      FINAL: 'Акыркы төлөм',
      REFUND: 'Кайтарым',
    },
  },
};

type Amount = Prisma.Decimal | number | string | null | undefined;

/**
 * How a document in `language` prints money, dates and coded values.
 * English keeps what documents always printed ("5,022,000.00 KGS",
 * "2026-10-21"); Russian and Kyrgyz use the local conventions
 * ("5 022 000,00 KGS", "21.10.2026").
 */
export function documentFormatter(language: DocumentLanguage) {
  const numberLocale = language === 'en' ? 'en-US' : 'ru-RU';
  const decimal = new Intl.NumberFormat(numberLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const plain = new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 2,
  });
  const labels = LABELS[language];
  const label = (table: Record<string, string>, code?: string | null) =>
    code ? (table[code] ?? code) : '';

  return {
    language,
    money: (value: Amount, currency?: string | null): string => {
      if (value === null || value === undefined) return '';
      const amount = decimal.format(Number(value));
      return currency ? `${amount} ${currency}` : amount;
    },
    number: (value: Amount): string => {
      if (value === null || value === undefined) return '';
      return plain.format(Number(value));
    },
    date: (value: Date | string | null | undefined): string => {
      if (!value) return '';
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return '';
      const iso = d.toISOString().slice(0, 10);
      if (language === 'en') return iso;
      const [year, month, day] = iso.split('-');
      return `${day}.${month}.${year}`;
    },
    unitType: (code?: string | null) => label(labels.unitType, code),
    financing: (code?: string | null) => label(labels.financing, code),
    paymentMethod: (code?: string | null) => label(labels.paymentMethod, code),
    paymentType: (code?: string | null) => label(labels.paymentType, code),
  };
}

export type DocumentFormatter = ReturnType<typeof documentFormatter>;
