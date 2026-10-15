import {missingLegalDetails} from './legal-details';

describe('missingLegalDetails (CA-4)', () => {
    it('lists the required details that are blank, in a fixed order', () => {
        expect(missingLegalDetails({legalName: 'ОсОО «Бишкек Девелопмент»', taxId: '  ', address: null})).toEqual(['taxId', 'address', 'signatoryName']);
    });

    it('is empty once everything a contract needs is there; the title is optional', () => {
        expect(missingLegalDetails({legalName: 'ОсОО', taxId: '0123', address: 'Бишкек', signatoryName: 'Асанов Н.'})).toEqual([]);
    });
});
