import {authenticator} from 'otplib';
import {TotpService} from './totp.service';

describe('TotpService', () => {
    const service = new TotpService();

    it('generates a secret usable to build a matching keyUri', () => {
        const secret = service.generateSecret();
        expect(typeof secret).toBe('string');
        expect(secret.length).toBeGreaterThan(0);

        const uri = service.keyUri('user@crm.dev', secret);
        expect(uri).toContain(encodeURIComponent('CRM Dev'));
        expect(uri).toContain(encodeURIComponent('user@crm.dev'));
    });

    it('verifies a token generated from the same secret', () => {
        const secret = service.generateSecret();
        const token = authenticator.generate(secret);

        expect(service.verify(token, secret)).toBe(true);
    });

    it('rejects a token generated from a different secret', () => {
        const secretA = service.generateSecret();
        const secretB = service.generateSecret();
        const token = authenticator.generate(secretA);

        expect(service.verify(token, secretB)).toBe(false);
    });

    it('rejects a malformed token instead of throwing', () => {
        const secret = service.generateSecret();
        expect(() => service.verify('not-a-valid-token', secret)).not.toThrow();
        expect(service.verify('not-a-valid-token', secret)).toBe(false);
    });

    it('rejects verification against an invalid secret instead of throwing', () => {
        expect(() => service.verify('123456', '')).not.toThrow();
        expect(service.verify('123456', '')).toBe(false);
    });
});
