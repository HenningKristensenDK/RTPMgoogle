import { useState, useRef } from "react";
import { X } from "lucide-react";
import type { Party, Risk, RoleResponsibility } from "../../types";
import { useAuthStore, currentIdentity } from "../../store/authStore";
import { sendRiskUpdate } from "../../firebase/firestore";
import { toast } from "../../lib/toast";

interface Props {
  risk: Risk;
  roles: RoleResponsibility[];
  onClose: () => void;
}

interface Recipient {
  key: string;
  workstream: string;
  slot: string;
  party: Party;
}

export default function SendUpdateModal({ risk, roles, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const me = currentIdentity(user);

  const riskRoles = roles.filter((r) => risk.workstreamIds.includes(r.id));

  const responsible: Recipient[] = [];
  const informed: Recipient[] = [];
  for (const r of riskRoles) {
    if (r.responsibleCustomer)
      responsible.push({ key: `${r.id}-rc`, workstream: r.workstream, slot: "Customer", party: r.responsibleCustomer });
    if (r.responsibleContractor)
      responsible.push({ key: `${r.id}-rk`, workstream: r.workstream, slot: "Contractor", party: r.responsibleContractor });
    if (r.informedCustomer)
      informed.push({ key: `${r.id}-ic`, workstream: r.workstream, slot: "Customer", party: r.informedCustomer });
    if (r.informedContractor)
      informed.push({ key: `${r.id}-ik`, workstream: r.workstream, slot: "Contractor", party: r.informedContractor });
  }

  const [toIds, setToIds] = useState<Set<string>>(
    () => new Set(responsible.map((r) => r.key))
  );
  const [ccIds, setCcIds] = useState<Set<string>>(
    () => new Set(informed.map((r) => r.key))
  );
  const [subject, setSubject] = useState(
    `Update: ${risk.riskId} — ${risk.title.replace(/◆/g, " - ")}`
  );
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function toggleId(
    set: Set<string>,
    id: string,
    setter: (s: Set<string>) => void
  ) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    try {
      const recipients = responsible
        .filter((r) => toIds.has(r.key))
        .map((r) => `${r.party.organization} — ${r.party.name} (${r.party.role})`);
      const cc = informed
        .filter((r) => ccIds.has(r.key))
        .map((r) => `${r.party.organization} — ${r.party.name} (${r.party.role})`);

      await sendRiskUpdate({
        riskId: risk.id,
        projectId: risk.projectId,
        sender: me.name,
        senderId: me.uid,
        subject,
        message,
        recipients,
        cc,
      });

      toast.success("Update sent");
      onClose();
    } catch {
      toast.error("Failed to send update");
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex w-[560px] max-h-[90vh] flex-col overflow-auto rounded-card bg-white shadow-panel">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-bordergray px-6 py-4">
          <span className="text-[15px] font-semibold text-ink">Send Update</span>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-6 py-5">

          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "#8a8ca6" }}
            >
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-input border border-bordergray px-3 py-2 text-[13px] text-ink outline-none focus:border-indigo"
            />
          </div>

          {/* To — Responsible */}
          <div className="flex flex-col gap-2">
            <label
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "#8a8ca6" }}
            >
              To (Responsible)
            </label>
            {responsible.length === 0 ? (
              <p className="text-[13px] text-gray-400">
                No responsible parties found for this risk's workstreams.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {responsible.map((r) => (
                  <label
                    key={r.key}
                    className="flex cursor-pointer items-center gap-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={toIds.has(r.key)}
                      onChange={() => toggleId(toIds, r.key, setToIds)}
                      className="h-4 w-4 rounded"
                      style={{ accentColor: "#0d08d2" }}
                    />
                    <span className="text-[13px] text-ink">
                      {r.party.organization} — {r.party.name} ({r.party.role})
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Cc — Informed */}
          <div className="flex flex-col gap-2">
            <label
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "#8a8ca6" }}
            >
              Cc (Informed)
            </label>
            {informed.length === 0 ? (
              <p className="text-[13px] text-gray-400">
                No informed parties found for this risk's workstreams.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {informed.map((r) => (
                  <label
                    key={r.key}
                    className="flex cursor-pointer items-center gap-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={ccIds.has(r.key)}
                      onChange={() => toggleId(ccIds, r.key, setCcIds)}
                      className="h-4 w-4 rounded"
                      style={{ accentColor: "#0d08d2" }}
                    />
                    <span className="text-[13px] text-ink">
                      {r.party.organization} — {r.party.name} ({r.party.role})
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "#8a8ca6" }}
            >
              Message
            </label>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                autoResize();
              }}
              placeholder="Write your update..."
              rows={4}
              className="w-full resize-none overflow-hidden rounded-input border border-bordergray px-3 py-2 text-[13px] text-ink outline-none focus:border-indigo"
              style={{ minHeight: "96px" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-bordergray px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-btn border border-bordergray px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="rounded-btn px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={{ background: "#ffcc00", color: "#070474" }}
          >
            {sending ? "Sending…" : "Send Update"}
          </button>
        </div>

      </div>
    </div>
  );
}
