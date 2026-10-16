import {api} from "@/lib/api";

/** The document types a company can write its own template for (CA-5). */
export const TEMPLATE_TYPES = ["RESERVATION", "CONTRACT", "PAYMENT_RECEIPT"] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export type TemplateVersion = {
    id: string;
    name: string;
    version: number;
    isActive: boolean;
    bodyHtml: string;
    createdAt: string;
    createdBy: {fullName: string} | null;
};

export type TemplateEditorData = {
    type: TemplateType;
    /** The company's active template; null while the built-in default is in use. */
    current: TemplateVersion | null;
    defaultHtml: string;
    placeholders: {token: string; example: string}[];
    versions: TemplateVersion[];
};

export async function getTemplateEditor(type: TemplateType) {
    const response = await api.get<TemplateEditorData>(`/document-templates/editor/${type}`);
    return response.data;
}

/** The template filled with sample data; a 400 says what can't be filled in. */
export async function previewTemplate(type: TemplateType, bodyHtml: string) {
    const response = await api.post<{html: string}>("/document-templates/preview", {type, bodyHtml});
    return response.data.html;
}

export async function saveTemplate(type: TemplateType, name: string, bodyHtml: string) {
    const response = await api.put<TemplateVersion>("/document-templates", {type, name, bodyHtml});
    return response.data;
}

export async function resetTemplate(type: TemplateType) {
    const response = await api.post<{reset: boolean}>(`/document-templates/${type}/reset`);
    return response.data;
}
