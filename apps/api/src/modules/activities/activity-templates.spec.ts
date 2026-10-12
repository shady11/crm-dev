import { readFileSync } from 'fs';
import { join } from 'path';
import { ACTIVITY_TEMPLATE_KEYS, activityText } from './activity-templates';

const LOCALES = ['en', 'ru', 'ky'];
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function localeTemplateKeys(lang: string): Set<string> {
  const file = join(
    __dirname,
    '../../../../web/src/lib/i18n/locales',
    lang,
    'activities.json',
  );
  const json = JSON.parse(readFileSync(file, 'utf8')) as {
    templates?: Record<string, string>;
  };
  return new Set(
    Object.keys(json.templates ?? {}).map((k) => k.replace(PLURAL_SUFFIX, '')),
  );
}

describe('activity templates', () => {
  it('returns the English title alongside the key and values it was built from', () => {
    expect(activityText('taskCreated', { task: 'Call back' })).toEqual({
      title: 'Task "Call back" created',
      templateKey: 'taskCreated',
      templateParams: { task: 'Call back' },
    });
    expect(activityText('unitReserved')).toEqual({
      title: 'Unit reserved',
      templateKey: 'unitReserved',
      templateParams: undefined,
    });
  });

  // A key the web doesn't know falls back to English, so a missing
  // translation wouldn't break anything: it would just quietly stay English.
  it.each(LOCALES)(
    'every template has a %s translation, and no translation is orphaned',
    (lang) => {
      expect([...localeTemplateKeys(lang)].sort()).toEqual(
        [...ACTIVITY_TEMPLATE_KEYS].sort(),
      );
    },
  );
});
