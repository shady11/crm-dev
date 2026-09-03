import {corsOptions, getAllowedOrigins, validateEnv} from './env.config';

describe('validateEnv', () => {
    const complete = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/crm',
        JWT_SECRET: 'secret',
        FRONTEND_URL: 'http://localhost:5173',
    };

    it('accepts a complete development environment', () => {
        expect(() => validateEnv({...complete})).not.toThrow();
    });

    it('names the variable that is missing', () => {
        expect(() => validateEnv({DATABASE_URL: 'x', JWT_SECRET: 'y'}))
            .toThrow(/FRONTEND_URL/);
    });

    it('treats a blank value as missing', () => {
        expect(() => validateEnv({...complete, FRONTEND_URL: '   '}))
            .toThrow(/FRONTEND_URL/);
    });

    it('requires UPLOADS_DIR only in production', () => {
        expect(() => validateEnv({...complete})).not.toThrow();
        expect(() => validateEnv({...complete, NODE_ENV: 'production'}))
            .toThrow(/UPLOADS_DIR/);
    });
});

describe('CORS configuration', () => {
    const originalFrontendUrl = process.env.FRONTEND_URL;

    afterAll(() => {
        process.env.FRONTEND_URL = originalFrontendUrl;
    });

    const allows = (requestOrigin: string | undefined): boolean | undefined => {
        let allowed: boolean | undefined;
        (corsOptions().origin as (
            origin: string | undefined,
            cb: (err: Error | null, allow?: boolean) => void,
        ) => void)(requestOrigin, (_err, ok) => {
            allowed = ok;
        });
        return allowed;
    };

    beforeEach(() => {
        // A CRM on a company network is commonly reached by more than one name.
        process.env.FRONTEND_URL = 'https://crm.example.kg, http://192.168.1.10/';
    });

    it('parses a comma-separated list and normalises trailing slashes', () => {
        expect(getAllowedOrigins()).toEqual([
            'https://crm.example.kg',
            'http://192.168.1.10',
        ]);
    });

    it('allows every configured origin', () => {
        expect(allows('https://crm.example.kg')).toBe(true);
        expect(allows('http://192.168.1.10')).toBe(true);
    });

    it('allows callers that send no Origin header', () => {
        // Health checks, curl, native socket clients — CORS does not apply.
        expect(allows(undefined)).toBe(true);
    });

    it('rejects an origin that is not configured', () => {
        expect(allows('https://evil.example')).toBe(false);
    });

    it('no longer allows the dev server unless it is configured', () => {
        // Regression guard: this origin used to be hardcoded in two places.
        expect(allows('http://localhost:5173')).toBe(false);
    });

    it('throws rather than silently allowing everything when unset', () => {
        delete process.env.FRONTEND_URL;
        expect(() => getAllowedOrigins()).toThrow(/FRONTEND_URL/);
    });
});
