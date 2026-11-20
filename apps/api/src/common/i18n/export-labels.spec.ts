import { exportLanguage, exportLabels } from './export-labels';

describe('exportLanguage', () => {
  it("takes the app's language from Accept-Language", () => {
    expect(exportLanguage('ky', 'ru-RU')).toBe('ky');
    expect(exportLanguage('ru-RU,ru;q=0.9,en;q=0.8', 'en-US')).toBe('ru');
  });

  it("falls back to the company's language, then English", () => {
    expect(exportLanguage(undefined, 'ru-RU')).toBe('ru');
    expect(exportLanguage('', null)).toBe('en');
    expect(exportLanguage('de-DE', 'ru-RU')).toBe('en');
  });

  it('has every word in every language', () => {
    const shape = (o: object): string[] =>
      Object.entries(o)
        .flatMap(([k, v]) =>
          v && typeof v === 'object' ? shape(v).map((s) => `${k}.${s}`) : [k],
        )
        .sort();
    expect(shape(exportLabels('ru'))).toEqual(shape(exportLabels('en')));
    expect(shape(exportLabels('ky'))).toEqual(shape(exportLabels('en')));
  });
});
