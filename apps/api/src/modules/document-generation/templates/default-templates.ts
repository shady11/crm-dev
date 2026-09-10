import { DocumentType } from '@/generated/prisma/client';

/**
 * Built-in fallback content, used whenever a company has no active
 * DocumentTemplate row for a given type. This is what makes generation work
 * from day one for every tenant without any admin setup — a company that
 * wants its own wording overrides these by creating a DocumentTemplate
 * (DocumentTemplatesService), which then takes precedence.
 *
 * These are deliberately plain — a real deployment should have its own
 * templates reviewed by whoever handles legal/compliance for that market
 * (see the spec's "legal review of default templates" risk). Shipping them
 * as *default* rather than *only* option is the point.
 */
const SHARED_STYLE = `
  * { box-sizing: border-box; }
  body {
    font-family: 'DejaVu Sans', Arial, sans-serif;
    font-size: 12px;
    color: #1a1a1a;
    line-height: 1.5;
    margin: 0;
    padding: 32px 40px;
  }
  @page { size: A4; margin: 20mm 16mm; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 13px; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.04em; }
  .subtitle { color: #555; margin: 0 0 24px; }
  .parties { display: flex; gap: 32px; margin-bottom: 20px; }
  .party { flex: 1; }
  .party .label { font-size: 10px; text-transform: uppercase; color: #777; letter-spacing: 0.05em; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
  th { color: #555; text-transform: uppercase; font-size: 9px; letter-spacing: 0.04em; }
  .totals { margin-top: 8px; }
  .totals .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .totals .row.grand { font-weight: bold; border-top: 1px solid #1a1a1a; margin-top: 4px; padding-top: 6px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 56px; }
  .signature-block { width: 45%; }
  .signature-line { border-top: 1px solid #1a1a1a; margin-top: 40px; padding-top: 4px; font-size: 10px; color: #555; }
  .note { margin-top: 20px; font-size: 10px; color: #777; }
`;

const RESERVATION_TEMPLATE = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${SHARED_STYLE}</style></head>
<body>
  <h1>Unit Reservation Agreement</h1>
  <p class="subtitle">Reservation No. {{deal.dealNumber}}{{#if deal.reservedAt}} &middot; {{deal.reservedAt}}{{/if}}</p>

  <div class="parties">
    <div class="party">
      <div class="label">Developer</div>
      <div>{{company.legalName}}</div>
      {{#if company.address}}<div>{{company.address}}</div>{{/if}}
      {{#if company.taxId}}<div>Tax ID: {{company.taxId}}</div>{{/if}}
    </div>
    <div class="party">
      <div class="label">Client</div>
      <div>{{client.fullName}}</div>
      <div>{{client.phone}}</div>
      {{#if client.address}}<div>{{client.address}}</div>{{/if}}
      {{#if client.passport}}<div>ID/Passport: {{client.passport}}</div>{{/if}}
    </div>
  </div>

  <h2>Reserved unit</h2>
  <table>
    <tr><th>Project</th><th>Unit</th><th>Type</th><th>Area</th><th>List price</th></tr>
    <tr>
      <td>{{unit.projectName}}</td>
      <td>{{unit.number}}</td>
      <td>{{unit.type}}</td>
      <td>{{unit.area}} m&sup2;</td>
      <td>{{deal.listPrice}}</td>
    </tr>
  </table>

  <div class="totals">
    <div class="row"><span>Agreed sale price</span><span>{{deal.salePrice}}</span></div>
    {{#if deal.discountAmount}}<div class="row"><span>Discount</span><span>-{{deal.discountAmount}}</span></div>{{/if}}
    {{#if deal.deposit}}<div class="row grand"><span>Deposit paid</span><span>{{deal.deposit}}</span></div>{{/if}}
  </div>

  <h2>Terms</h2>
  <p>
    The Developer holds the above unit for the Client until
    <strong>{{deal.reservationExpiresAt}}</strong>. The reservation lapses and the unit
    returns to available inventory if a sale contract is not signed by that date.
  </p>
  {{#if deal.note}}<p class="note">Note: {{deal.note}}</p>{{/if}}

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line">{{company.signatoryName}}{{#if company.signatoryTitle}}, {{company.signatoryTitle}}{{/if}} — for the Developer</div>
    </div>
    <div class="signature-block">
      <div class="signature-line">{{client.fullName}} — Client</div>
    </div>
  </div>
</body>
</html>`;

const CONTRACT_TEMPLATE = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${SHARED_STYLE}</style></head>
<body>
  <h1>Unit Sale Contract</h1>
  <p class="subtitle">Contract No. {{deal.contractNumber}} &middot; {{deal.contractDate}}</p>

  <div class="parties">
    <div class="party">
      <div class="label">Seller</div>
      <div>{{company.legalName}}</div>
      {{#if company.address}}<div>{{company.address}}</div>{{/if}}
      {{#if company.taxId}}<div>Tax ID: {{company.taxId}}</div>{{/if}}
      {{#if company.phone}}<div>{{company.phone}}</div>{{/if}}
    </div>
    <div class="party">
      <div class="label">Buyer</div>
      <div>{{client.fullName}}</div>
      <div>{{client.phone}}</div>
      {{#if client.address}}<div>{{client.address}}</div>{{/if}}
      {{#if client.passport}}<div>ID/Passport: {{client.passport}}</div>{{/if}}
      {{#if client.pin}}<div>PIN: {{client.pin}}</div>{{/if}}
    </div>
  </div>

  <h2>Subject of the contract</h2>
  <table>
    <tr><th>Project</th><th>Unit</th><th>Type</th><th>Rooms</th><th>Area</th></tr>
    <tr>
      <td>{{unit.projectName}}</td>
      <td>{{unit.blockName}} / {{unit.number}}</td>
      <td>{{unit.type}}</td>
      <td>{{unit.rooms}}</td>
      <td>{{unit.area}} m&sup2;</td>
    </tr>
  </table>

  <h2>Price and payment</h2>
  <div class="totals">
    <div class="row"><span>List price</span><span>{{deal.listPrice}}</span></div>
    {{#if deal.discountAmount}}<div class="row"><span>Discount ({{deal.discountPercent}}%)</span><span>-{{deal.discountAmount}}</span></div>{{/if}}
    <div class="row grand"><span>Sale price</span><span>{{deal.salePrice}}</span></div>
    <div class="row"><span>Financing</span><span>{{deal.financingType}}</span></div>
  </div>

  {{#if schedule.rows}}
  <h2>Payment schedule</h2>
  <table>
    <tr><th>#</th><th>Due date</th><th>Amount</th></tr>
    {{#each schedule.rows}}
    <tr><td>{{order}}</td><td>{{dueDate}}</td><td>{{amount}}</td></tr>
    {{/each}}
  </table>
  {{/if}}

  {{#if deal.note}}<p class="note">Note: {{deal.note}}</p>{{/if}}

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line">{{company.signatoryName}}{{#if company.signatoryTitle}}, {{company.signatoryTitle}}{{/if}} — for the Seller</div>
    </div>
    <div class="signature-block">
      <div class="signature-line">{{client.fullName}} — Buyer</div>
    </div>
  </div>
</body>
</html>`;

export const DEFAULT_TEMPLATES: Partial<Record<DocumentType, string>> = {
  [DocumentType.RESERVATION]: RESERVATION_TEMPLATE,
  [DocumentType.CONTRACT]: CONTRACT_TEMPLATE,
};
