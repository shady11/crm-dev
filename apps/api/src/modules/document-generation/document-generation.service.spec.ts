import { DocumentGenerationService } from './document-generation.service';
import { DocumentType } from '@/generated/prisma/client';
import { TemplateRenderFailedException, UnsupportedDocumentTypeException } from './exceptions';
import { renderHtmlToPdf } from './pdf-renderer';

jest.mock('./pdf-renderer', () => ({
  renderHtmlToPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-fake')),
}));

const baseDeal = {
  id: 'deal-1',
  dealNumber: '2026-0001',
  status: 'RESERVED',
  financingType: 'CASH',
  listPrice: 100000,
  salePrice: 95000,
  discountAmount: 5000,
  discountPercent: 5,
  deposit: 1000,
  reservedAt: new Date('2026-01-01'),
  reservationExpiresAt: new Date('2026-01-10'),
  contractNumber: null,
  contractDate: null,
  note: null,
  client: {
    fullName: 'Client One',
    phone: '+996700000000',
    email: null,
    passport: null,
    pin: null,
    address: null,
  },
  manager: {
    fullName: 'Manager One',
    phone: '+996700000001',
    email: 'm@crm.dev',
  },
  project: { name: 'Skyline' },
  unit: {
    number: '101',
    type: 'APARTMENT',
    rooms: 2,
    area: 54.5,
    block: { name: 'A' },
    entrance: { name: '1' },
    floor: { number: 3 },
  },
  paymentSchedules: [],
};

const baseCompany = {
  id: 'company-1',
  name: 'Acme Homes',
  legalName: 'Acme Homes LLC',
  address: '1 Main St',
  phone: '+996700000002',
  taxId: '12345',
  signatoryName: 'Jane Doe',
  signatoryTitle: 'Director',
  currency: 'USD',
};

function build() {
  const prisma = {
    deal: { findUniqueOrThrow: jest.fn().mockResolvedValue(baseDeal) },
    company: { findUniqueOrThrow: jest.fn().mockResolvedValue(baseCompany) },
    documentTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
    document: {
      create: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve({ id: 'doc-1', ...data }),
        ),
    },
  };

  const storage = {
    save: jest.fn().mockResolvedValue('company-1/generated.pdf'),
    getStream: jest.fn(),
  };

  const service = new DocumentGenerationService(prisma as any, storage);
  return { service, prisma, storage };
}

describe('DocumentGenerationService', () => {
  it('falls back to the built-in default template when the company has none active', async () => {
    const { service, prisma } = build();

    const document = await service.generateForDeal({
      companyId: 'company-1',
      dealId: 'deal-1',
      type: DocumentType.RESERVATION,
      userId: 'user-1',
    });

    expect(prisma.documentTemplate.findFirst).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        type: DocumentType.RESERVATION,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { version: 'desc' },
    });
    expect(document).toMatchObject({
      id: 'doc-1',
      type: DocumentType.RESERVATION,
      ownerType: 'DEAL',
      ownerId: 'deal-1',
      companyId: 'company-1',
      uploadedById: 'user-1',
      generatedFromTemplateId: undefined,
      mimeType: 'application/pdf',
      extension: 'pdf',
      path: 'company-1/generated.pdf',
    });
  });

  it("prefers the company's active template over the built-in default", async () => {
    const { service, prisma } = build();
    prisma.documentTemplate.findFirst.mockResolvedValue({
      id: 'tpl-1',
      bodyHtml: '<html><body>{{deal.dealNumber}}</body></html>',
    });

    const document = await service.generateForDeal({
      companyId: 'company-1',
      dealId: 'deal-1',
      type: DocumentType.CONTRACT,
      userId: 'user-1',
    });

    expect(document.generatedFromTemplateId).toBe('tpl-1');
  });

  it('rejects a document type with neither a company template nor a built-in default', async () => {
    const { service } = build();

    await expect(
      service.generateForDeal({
        companyId: 'company-1',
        dealId: 'deal-1',
        type: DocumentType.INVOICE,
        userId: 'user-1',
      }),
    ).rejects.toThrow(UnsupportedDocumentTypeException);
  });

  it('wraps a Handlebars compile/render failure in TemplateRenderFailedException instead of letting it propagate raw', async () => {
    const { service, prisma } = build();
    // Strict mode throws when a template dereferences a property on a
    // missing object, rather than silently rendering nothing.
    prisma.documentTemplate.findFirst.mockResolvedValue({
      id: 'tpl-1',
      bodyHtml: '<html>{{missing.nested}}</html>',
    });

    await expect(
      service.generateForDeal({
        companyId: 'company-1',
        dealId: 'deal-1',
        type: DocumentType.CONTRACT,
        userId: 'user-1',
      }),
    ).rejects.toThrow(TemplateRenderFailedException);
  });

  it('never reaches PDF rendering or storage when the template fails to compile', async () => {
    const { service, prisma, storage } = build();
    prisma.documentTemplate.findFirst.mockResolvedValue({
      id: 'tpl-1',
      bodyHtml: '<html>{{missing.nested}}</html>',
    });

    await expect(
      service.generateForDeal({
        companyId: 'company-1',
        dealId: 'deal-1',
        type: DocumentType.CONTRACT,
        userId: 'user-1',
      }),
    ).rejects.toThrow();

    expect(storage.save).not.toHaveBeenCalled();
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it('renders the template with the built deal/company context substituted in', async () => {
    const { service, prisma } = build();
    prisma.documentTemplate.findFirst.mockResolvedValue({
      id: 'tpl-1',
      bodyHtml: '<html>{{deal.dealNumber}} / {{company.name}}</html>',
    });

    await service.generateForDeal({
      companyId: 'company-1',
      dealId: 'deal-1',
      type: DocumentType.CONTRACT,
      userId: 'user-1',
    });

    const calls = (renderHtmlToPdf as jest.Mock).mock.calls;
    const renderedHtml = calls[calls.length - 1][0];
    expect(renderedHtml).toContain('2026-0001');
    expect(renderedHtml).toContain('Acme Homes');
  });

  it('saves the rendered PDF under the company and stores its returned relative path', async () => {
    const { service, prisma, storage } = build();

    await service.generateForDeal({
      companyId: 'company-1',
      dealId: 'deal-1',
      type: DocumentType.RESERVATION,
      userId: 'user-1',
    });

    expect(storage.save).toHaveBeenCalledWith(
      'company-1',
      expect.stringMatching(/^[0-9a-f-]+\.pdf$/i),
      expect.any(Buffer),
    );
    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ path: 'company-1/generated.pdf' }) }),
    );
  });

  it('names the stored document from the document type and the deal number', async () => {
    const { service, prisma } = build();

    await service.generateForDeal({
      companyId: 'company-1',
      dealId: 'deal-1',
      type: DocumentType.RESERVATION,
      userId: 'user-1',
    });

    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ originalName: 'reservation-2026-0001.pdf' }) }),
    );
  });

  it('records the rendered PDF size and content type', async () => {
    const { service, prisma } = build();

    await service.generateForDeal({
      companyId: 'company-1',
      dealId: 'deal-1',
      type: DocumentType.RESERVATION,
      userId: 'user-1',
    });

    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mimeType: 'application/pdf',
          extension: 'pdf',
          size: Buffer.from('%PDF-fake').length,
        }),
      }),
    );
  });

  it('picks the highest-version active template when more than one exists', async () => {
    const { service, prisma } = build();
    await service.generateForDeal({
      companyId: 'company-1',
      dealId: 'deal-1',
      type: DocumentType.RESERVATION,
      userId: 'user-1',
    });

    expect(prisma.documentTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { version: 'desc' } }),
    );
  });
});
