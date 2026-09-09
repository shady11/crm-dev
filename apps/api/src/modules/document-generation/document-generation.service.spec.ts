import { DocumentGenerationService } from './document-generation.service';
import { DocumentType } from '@/generated/prisma/client';
import { UnsupportedDocumentTypeException } from './exceptions';

jest.mock('./pdf-renderer', () => ({
  renderHtmlToPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-fake')),
}));

jest.mock('@/modules/documents/documents.constants', () => ({
  saveFileToDisk: jest.fn().mockResolvedValue('company-1/generated.pdf'),
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

  const service = new DocumentGenerationService(prisma as any);
  return { service, prisma };
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
});
