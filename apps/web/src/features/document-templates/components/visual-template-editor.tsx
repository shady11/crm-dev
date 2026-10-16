import {type RefObject, useCallback, useEffect, useImperativeHandle, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Redo2,
    RemoveFormatting,
    TextAlignCenter,
    TextAlignEnd,
    TextAlignStart,
    Underline,
    Undo2,
    type LucideIcon,
} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {NativeSelect, NativeSelectOption} from "@/components/ui/native-select.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import {cn} from "@/lib/utils";
import {
    EDITOR_ONLY_ATTR,
    protectTokens,
    serializeEditable,
    showChips,
    tokensToNodes,
    withHeadMarkup,
} from "../lib/editable-template";

/**
 * Keyboard moves (End on a line ending in a chip) can put the cursor inside
 * a chip, where typing does nothing; this puts it beside the chip instead.
 */
function moveCaretOutOfChip(doc: Document): boolean {
    const selection = doc.getSelection();
    const anchor = selection?.anchorNode;
    const chip = (anchor instanceof Element ? anchor : anchor?.parentElement)?.closest(".hb-chip");
    if (!selection || !chip || !selection.isCollapsed) return false;
    const range = doc.createRange();
    if (selection.anchorOffset === 0) range.setStartBefore(chip);
    else range.setStartAfter(chip);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
}

const CHIP_WRAPPERS: Record<string, {tag: string; matches: string}> = {
    bold: {tag: "b", matches: "b, strong"},
    italic: {tag: "i", matches: "i, em"},
    underline: {tag: "u", matches: "u"},
};

/** The selected text, without the chips' own labels. */
function rangeText(range: Range): string {
    const fragment = range.cloneContents();
    fragment.querySelectorAll(".hb-chip").forEach((chip) => chip.remove());
    return fragment.textContent ?? "";
}

function elementHas(element: Element, command: string): boolean {
    const style = element.ownerDocument.defaultView?.getComputedStyle(element);
    if (command === "bold") return Number(style?.fontWeight) >= 600;
    if (command === "italic") return style?.fontStyle === "italic";
    return !!element.closest(`${CHIP_WRAPPERS.underline.matches}, [style*="underline"]`);
}

const chipHas = (chip: HTMLElement, command: string) =>
    command === "underline" ? !!chip.parentElement && elementHas(chip.parentElement, command) : elementHas(chip, command);

/** The part of a range from its first to its last selected text outside chips. */
function textOnlyRange(doc: Document, range: Range): Range {
    const texts: Text[] = [];
    const walker = doc.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    let node: Node | null = walker.currentNode.nodeType === Node.TEXT_NODE ? walker.currentNode : walker.nextNode();
    for (; node; node = walker.nextNode()) {
        if (range.intersectsNode(node) && !node.parentElement?.closest(".hb-chip") && node.textContent?.trim()) {
            texts.push(node as Text);
        }
    }
    const result = range.cloneRange();
    const first = texts[0];
    const last = texts.at(-1);
    if (!first || !last) return result;
    result.setStart(first, first === range.startContainer ? range.startOffset : 0);
    result.setEnd(last, last === range.endContainer ? range.endOffset : last.length);
    return result;
}

/** Whether every visible bit of selected text (outside chips) already has the format. */
function textHas(doc: Document, range: Range, command: string): boolean {
    const walker = doc.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    let node: Node | null = walker.currentNode.nodeType === Node.TEXT_NODE ? walker.currentNode : walker.nextNode();
    for (; node; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (!parent || !range.intersectsNode(node) || parent.closest(".hb-chip") || !node.textContent?.trim()) continue;
        if (!elementHas(parent, command)) return false;
    }
    return true;
}

function formatChip(doc: Document, chip: HTMLElement, command: string, apply: boolean) {
    const {tag, matches} = CHIP_WRAPPERS[command];
    if (apply && !chipHas(chip, command)) {
        const wrapper = doc.createElement(tag);
        chip.replaceWith(wrapper);
        wrapper.appendChild(chip);
    } else if (!apply) {
        // Only a wrapper holding nothing but this chip is removed; a chip
        // inside a longer bold run stays as it is.
        const wrapper = chip.parentElement;
        if (wrapper?.matches(matches) && wrapper.childNodes.length === 1) wrapper.replaceWith(chip);
    }
}

export type VisualTemplateEditorHandle = {
    /** Puts placeholder text (one or more {{…}}) where the cursor was. */
    insert(text: string): void;
};

/** Only for editing: chip look and a page without a focus outline. Never saved. */
const EDITOR_CSS = `
html { background: #fff; }
body { outline: none; min-height: 100%; }
.hb-chip {
  display: inline-block; padding: 0 4px; margin: 0 1px; border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.82em; line-height: 1.4;
  background: #eef2ff; color: #3730a3; border: 1px solid #c7d2fe;
  white-space: nowrap; cursor: default; vertical-align: baseline; text-transform: none; letter-spacing: 0;
}
.hb-chip.hb-open, .hb-chip.hb-close, .hb-chip.hb-else { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.hb-chip.hb-comment { background: #f4f4f5; color: #71717a; border-color: #e4e4e7; }
`;

type Command = {command: string; icon: LucideIcon; labelKey: string};

const INLINE: Command[] = [
    {command: "bold", icon: Bold, labelKey: "templates.toolbar.bold"},
    {command: "italic", icon: Italic, labelKey: "templates.toolbar.italic"},
    {command: "underline", icon: Underline, labelKey: "templates.toolbar.underline"},
];
const LISTS: Command[] = [
    {command: "insertUnorderedList", icon: List, labelKey: "templates.toolbar.bulletList"},
    {command: "insertOrderedList", icon: ListOrdered, labelKey: "templates.toolbar.numberedList"},
];
const ALIGN: Command[] = [
    {command: "justifyLeft", icon: TextAlignStart, labelKey: "templates.toolbar.alignLeft"},
    {command: "justifyCenter", icon: TextAlignCenter, labelKey: "templates.toolbar.alignCenter"},
    {command: "justifyRight", icon: TextAlignEnd, labelKey: "templates.toolbar.alignRight"},
];
const STATEFUL = [...INLINE, ...LISTS, ...ALIGN].map((c) => c.command);
const BLOCKS = ["p", "h1", "h2", "h3"] as const;

/**
 * CA-5: edit a template as the document itself. The template is shown in
 * a frame with `sandbox="allow-same-origin"` and no `allow-scripts`, so this
 * page can edit it but nothing in it can run. Placeholders and conditions
 * appear as locked chips; see editable-template.ts for how they survive the
 * round trip.
 */
export function VisualTemplateEditor({
    html,
    onChange,
    fontCss,
    examples,
    handleRef,
}: {
    html: string;
    onChange(html: string): void;
    fontCss: string;
    examples: Map<string, string>;
    handleRef: RefObject<VisualTemplateEditorHandle | null>;
}) {
    const {t} = useTranslation("documents");
    const frameRef = useRef<HTMLIFrameElement>(null);
    const savedRange = useRef<Range | null>(null);
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);
    // The HTML this editor last produced; anything else coming in (HTML tab,
    // an earlier version, the default) reloads the frame.
    const lastHtml = useRef(html);
    const build = useCallback(
        (source: string) =>
            withHeadMarkup(
                protectTokens(source),
                `<style ${EDITOR_ONLY_ATTR}>${fontCss}</style><style ${EDITOR_ONLY_ATTR}>${EDITOR_CSS}</style>`,
            ),
        [fontCss],
    );
    const [srcDoc, setSrcDoc] = useState(() => build(html));
    const [active, setActive] = useState<Record<string, boolean>>({});
    const [block, setBlock] = useState("p");

    useEffect(() => {
        if (html === lastHtml.current) return;
        lastHtml.current = html;
        setSrcDoc(build(html));
    }, [html, build]);

    const frameDoc = () => frameRef.current?.contentDocument ?? null;

    const emit = useCallback(() => {
        const doc = frameDoc();
        if (!doc) return;
        const next = serializeEditable(doc);
        if (next === lastHtml.current) return;
        lastHtml.current = next;
        onChangeRef.current(next);
    }, []);

    const fitHeight = useCallback(() => {
        const frame = frameRef.current;
        const doc = frameDoc();
        if (frame && doc) frame.style.height = `${Math.max(doc.documentElement.scrollHeight, 600)}px`;
    }, []);

    const readState = useCallback(() => {
        const doc = frameDoc();
        if (!doc) return;
        if (moveCaretOutOfChip(doc)) return;
        const selection = doc.getSelection();
        if (selection?.rangeCount && doc.body.contains(selection.anchorNode)) {
            savedRange.current = selection.getRangeAt(0).cloneRange();
        }
        setActive(Object.fromEntries(STATEFUL.map((command) => [command, doc.queryCommandState(command)])));
        const value = doc.queryCommandValue("formatBlock").toLowerCase();
        setBlock((BLOCKS as readonly string[]).includes(value) ? value : "p");
    }, []);

    const onLoad = () => {
        const doc = frameDoc();
        if (!doc?.body) return;
        showChips(doc, examples);
        doc.body.setAttribute("contenteditable", "true");
        doc.body.setAttribute("spellcheck", "false");
        doc.execCommand("defaultParagraphSeparator", false, "p");
        savedRange.current = null;

        doc.addEventListener("input", () => {
            emit();
            fitHeight();
        });
        doc.addEventListener("selectionchange", readState);
        // selectionchange arrives a moment late; fix the cursor before a key
        // or text input acts on it, too.
        doc.addEventListener("keydown", () => moveCaretOutOfChip(doc), true);
        doc.addEventListener("beforeinput", () => moveCaretOutOfChip(doc), true);
        // Pasted text arrives as plain text, so Word's styling doesn't come along.
        doc.addEventListener("paste", (event) => {
            event.preventDefault();
            doc.execCommand("insertText", false, event.clipboardData?.getData("text/plain") ?? "");
        });
        // A chip can't hold the cursor, so a click on one puts it beside
        // the chip (whichever side was clicked) and typing carries on there.
        doc.addEventListener("mousedown", (event) => {
            const chip = (event.target as Element).closest?.(".hb-chip");
            if (!chip || event.shiftKey) return;
            event.preventDefault();
            frameRef.current?.contentWindow?.focus();
            const rect = chip.getBoundingClientRect();
            const range = doc.createRange();
            if (event.clientX < rect.left + rect.width / 2) range.setStartBefore(chip);
            else range.setStartAfter(chip);
            range.collapse(true);
            const selection = doc.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        });
        // Links in a template are text here, not something to follow.
        doc.addEventListener("click", (event) => {
            if ((event.target as Element).closest?.("a")) event.preventDefault();
        });
        fitHeight();
        // Fonts and images can change the height after load.
        void doc.fonts?.ready.then(fitHeight);
    };

    const run = (command: string, value?: string) => {
        const doc = frameDoc();
        if (!doc) return;
        frameRef.current?.contentWindow?.focus();
        restoreSelection(doc);
        const selection = doc.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        const chips =
            range && command in CHIP_WRAPPERS
                ? Array.from(doc.querySelectorAll<HTMLElement>(".hb-chip")).filter((chip) => range.intersectsNode(chip))
                : [];
        if (chips.length) {
            // The browser formats text but skips locked chips, so the toggle
            // is decided here over both: on unless text and chips all have
            // it already. Then the text is brought to that state and the
            // chips formatted the same way, so a bold line prints its values
            // bold too.
            const hasText = !!range && rangeText(range).trim().length > 0;
            const textOn = hasText && textHas(doc, range!, command);
            const apply = !((!hasText || textOn) && chips.every((chip) => chipHas(chip, command)));
            if (hasText && textOn !== apply) {
                // The browser decides its toggle from where the selection
                // ends, which may be after a chip; run it over the text part
                // only, then give the person their selection back. Ranges
                // are live, so `range` follows the DOM changes.
                const original = range!.cloneRange();
                selection!.removeAllRanges();
                selection!.addRange(textOnlyRange(doc, original));
                doc.execCommand(command, false, value);
                selection!.removeAllRanges();
                selection!.addRange(original);
            }
            chips.forEach((chip) => formatChip(doc, chip, command, apply));
        } else {
            doc.execCommand(command, false, value);
        }
        emit();
        readState();
        fitHeight();
    };

    const restoreSelection = (doc: Document) => {
        const selection = doc.getSelection();
        if (!selection) return;
        if (selection.rangeCount && doc.body.contains(selection.anchorNode)) return;
        let range = savedRange.current;
        if (!range || !doc.body.contains(range.startContainer)) {
            range = doc.createRange();
            range.selectNodeContents(doc.body);
            range.collapse(false);
        }
        selection.removeAllRanges();
        selection.addRange(range);
    };

    useImperativeHandle(handleRef, () => ({
        insert(text: string) {
            const doc = frameDoc();
            if (!doc) return;
            frameRef.current?.contentWindow?.focus();
            restoreSelection(doc);
            const selection = doc.getSelection();
            if (!selection?.rangeCount) return;
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const fragment = doc.createDocumentFragment();
            const nodes = tokensToNodes(doc, text, examples);
            nodes.forEach((node) => fragment.appendChild(node));
            const last = nodes.at(-1);
            range.insertNode(fragment);
            if (last) {
                range.setStartAfter(last);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            emit();
            readState();
        },
    }));

    const toolButton = ({command, icon: Icon, labelKey}: Command) => (
        <Button
            key={command}
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={t(labelKey)}
            title={t(labelKey)}
            aria-pressed={!!active[command]}
            className={cn(active[command] && "bg-accent text-accent-foreground")}
            // Keep the cursor in the document while clicking the toolbar.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => run(command)}
        >
            <Icon className="size-4" />
        </Button>
    );

    return (
        <div className="overflow-hidden rounded-lg border">
            <div
                role="toolbar"
                aria-label={t("templates.toolbar.label")}
                className="bg-background flex flex-wrap items-center gap-1 border-b px-2 py-1.5"
            >
                {toolButton({command: "undo", icon: Undo2, labelKey: "templates.toolbar.undo"})}
                {toolButton({command: "redo", icon: Redo2, labelKey: "templates.toolbar.redo"})}
                <Separator orientation="vertical" className="mx-1 h-5" />
                <NativeSelect
                    size="sm"
                    aria-label={t("templates.toolbar.textStyle")}
                    value={block}
                    onChange={(event) => run("formatBlock", event.target.value)}
                >
                    {BLOCKS.map((tag) => (
                        <NativeSelectOption key={tag} value={tag}>
                            {t(`templates.toolbar.blocks.${tag}`)}
                        </NativeSelectOption>
                    ))}
                </NativeSelect>
                <Separator orientation="vertical" className="mx-1 h-5" />
                {INLINE.map(toolButton)}
                <Separator orientation="vertical" className="mx-1 h-5" />
                {LISTS.map(toolButton)}
                <Separator orientation="vertical" className="mx-1 h-5" />
                {ALIGN.map(toolButton)}
                <Separator orientation="vertical" className="mx-1 h-5" />
                {toolButton({command: "removeFormat", icon: RemoveFormatting, labelKey: "templates.toolbar.clearFormatting"})}
            </div>
            <div className="bg-muted/50 max-h-[52rem] overflow-auto p-4 sm:p-6">
                <iframe
                    ref={frameRef}
                    title={t("templates.modes.visual")}
                    sandbox="allow-same-origin"
                    srcDoc={srcDoc}
                    onLoad={onLoad}
                    className="mx-auto block min-h-[600px] w-full max-w-[794px] bg-white shadow-sm"
                />
            </div>
        </div>
    );
}
