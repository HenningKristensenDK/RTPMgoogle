import { useState, useRef, useEffect, useMemo } from "react";
import {
  Send,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Code,
  ImagePlus,
  X,
} from "lucide-react";
import type { ChatMode, RoleResponsibility } from "../../types";

interface Props {
  mode: ChatMode;
  disabled?: boolean;
  members: RoleResponsibility[];
  onSend: (text: string, images: File[]) => void;
}

export default function ChatInput({ mode, disabled, members, onSend }: Props) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(
    () => images.map((f) => URL.createObjectURL(f)),
    [images]
  );
  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }

  useEffect(() => {
    if (!text && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text]);

  // Distinct mention candidates by person name, across all R&R slots.
  const mentionNames = [
    ...new Set(
      members.flatMap((m) =>
        [
          m.accountable,
          ...m.consulted,
          m.responsibleCustomer,
          m.responsibleContractor,
          ...m.informedCustomer,
          ...m.informedContractor,
        ]
          .filter((p): p is NonNullable<typeof p> => p !== null)
          .map((p) => p.name)
      )
    ),
  ];

  function submit() {
    const value = text.trim();
    if ((!value && images.length === 0) || disabled) return;
    onSend(value, images);
    setText("");
    setImages([]);
    setMentionOpen(false);
  }

  function handleChange(value: string) {
    setText(value);
    // Open the mention picker when the last token starts with '@' (team chat).
    if (mode === "chat") {
      const lastToken = value.split(/\s/).pop() || "";
      setMentionOpen(lastToken.startsWith("@") && mentionNames.length > 0);
    }
  }

  function applyMention(name: string) {
    const tokens = text.split(/\s/);
    tokens[tokens.length - 1] = `@${name}`;
    setText(tokens.join(" ") + " ");
    setMentionOpen(false);
  }

  function addImages(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length) setImages((prev) => [...prev, ...arr]);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length) {
      e.preventDefault();
      addImages(files);
    }
  }

  /** Wrap the current selection with markdown syntax (or insert a placeholder). */
  function applyFormat(before: string, after: string = before, placeholder = "text") {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = text.slice(start, end) || placeholder;
    const next = text.slice(0, start) + before + selected + after + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + before.length + selected.length + after.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  function applyBulletList() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = text.slice(start, end) || "List item";
    const lines = selected
      .split("\n")
      .map((l) => (l.startsWith("- ") ? l : `- ${l}`))
      .join("\n");
    const next = text.slice(0, start) + lines + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, start + lines.length);
    });
  }

  function applyLink() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = text.slice(start, end) || "link text";
    const url = window.prompt("Link URL", "https://");
    if (!url) return;
    const md = `[${selected}](${url})`;
    const next = text.slice(0, start) + md + text.slice(end);
    setText(next);
    requestAnimationFrame(() => el.focus());
  }

  const accent = mode === "agent" ? "#ff8b00" : "#0d08d2";
  const toolBtnCls =
    "flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700";

  return (
    <div className="relative border-t border-bordergray p-3">
      {mentionOpen && (
        <div className="absolute bottom-full left-3 mb-1 w-56 rounded-card border border-bordergray bg-white py-1 shadow-panel">
          {mentionNames.map((name) => (
            <button
              key={name}
              onClick={() => applyMention(name)}
              className="block w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-gray-50"
            >
              @{name}
            </button>
          ))}
        </div>
      )}

      {/* Formatting toolbar */}
      <div className="mb-1.5 flex items-center gap-0.5">
        <button type="button" title="Bold" className={toolBtnCls} onClick={() => applyFormat("**")}>
          <Bold size={13} />
        </button>
        <button type="button" title="Italic" className={toolBtnCls} onClick={() => applyFormat("_")}>
          <Italic size={13} />
        </button>
        <button type="button" title="Bulleted list" className={toolBtnCls} onClick={applyBulletList}>
          <List size={13} />
        </button>
        <button type="button" title="Code" className={toolBtnCls} onClick={() => applyFormat("`")}>
          <Code size={13} />
        </button>
        <button type="button" title="Link" className={toolBtnCls} onClick={applyLink}>
          <LinkIcon size={13} />
        </button>
        <div className="mx-1 h-4 w-px bg-bordergray" />
        <button
          type="button"
          title="Attach image or screenshot"
          className={toolBtnCls}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus size={14} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addImages(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Pending image previews */}
      {previews.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {previews.map((src, i) => (
            <div key={src} className="group relative h-14 w-14 shrink-0">
              <img
                src={src}
                alt=""
                className="h-full w-full rounded-btn border border-bordergray object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-700 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          disabled={disabled}
          onChange={(e) => { handleChange(e.target.value); resize(); }}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            mode === "agent"
              ? "Ask Risk Management Agent…"
              : "Message the team…  (@ to mention, paste a screenshot)"
          }
          rows={2}
          className="scroll-thin flex-1 resize-none rounded-input border border-bordergray px-3 py-2 text-sm outline-none focus:border-indigo focus:ring-1 focus:ring-indigo disabled:bg-gray-50"
          style={{ minHeight: "2.5rem", maxHeight: "9rem" }}
        />
        <button
          onClick={submit}
          disabled={disabled || (!text.trim() && images.length === 0)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn text-white disabled:opacity-40"
          style={{ background: accent }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
