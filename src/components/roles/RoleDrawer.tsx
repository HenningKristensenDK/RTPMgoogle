import { useEffect, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { Party, RoleResponsibility } from "../../types";

interface Props {
  role: RoleResponsibility | null;
  open: boolean;
  onClose: () => void;
  onSave: (patch: Partial<RoleResponsibility>) => Promise<void> | void;
}

const EMPTY_PARTY: Party = { name: "", organization: "", role: "" };

function emptyDraft(): Omit<RoleResponsibility, "id" | "projectId"> {
  return {
    workstream: "",
    description: "",
    accountable: { ...EMPTY_PARTY },
    consulted: [],
    responsibleCustomer: null,
    responsibleContractor: null,
    informedCustomer: [],
    informedContractor: [],
    interactionSummary: "",
  };
}

const labelCls = "mb-1 block text-[11px] font-medium text-gray-500";
const inputCls =
  "w-full rounded-input border border-bordergray px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-indigo focus:ring-1 focus:ring-indigo";

function PartyFields({
  party,
  onChange,
}: {
  party: Party;
  onChange: (next: Party) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <input
        className={inputCls}
        placeholder="Name"
        value={party.name}
        onChange={(e) => onChange({ ...party, name: e.target.value })}
      />
      <input
        className={inputCls}
        placeholder="Organization"
        value={party.organization}
        onChange={(e) => onChange({ ...party, organization: e.target.value })}
      />
      <input
        className={inputCls}
        placeholder="Role"
        value={party.role}
        onChange={(e) => onChange({ ...party, role: e.target.value })}
      />
    </div>
  );
}

function ClearablePartyField({
  label,
  party,
  onChange,
}: {
  label: string;
  party: Party | null;
  onChange: (next: Party | null) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className={labelCls}>{label}</span>
        {party !== null && (
          <button
            onClick={() => onChange(null)}
            className="text-[11px] text-gray-400 hover:text-critical"
          >
            Clear
          </button>
        )}
      </div>
      {party === null ? (
        <button
          onClick={() => onChange({ ...EMPTY_PARTY })}
          className="flex items-center gap-1 rounded-input border border-dashed border-bordergray px-2.5 py-1.5 text-[12px] text-gray-400 hover:text-indigo"
        >
          <Plus size={13} /> Add person
        </button>
      ) : (
        <PartyFields party={party} onChange={onChange} />
      )}
    </div>
  );
}

function PartyListEditor({
  label,
  people,
  onChange,
}: {
  label: string;
  people: Party[];
  onChange: (next: Party[]) => void;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex flex-col gap-2">
        {people.map((p, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">
              <PartyFields
                party={p}
                onChange={(next) => {
                  const copy = [...people];
                  copy[i] = next;
                  onChange(copy);
                }}
              />
            </div>
            <button
              onClick={() => onChange(people.filter((_, idx) => idx !== i))}
              className="mt-1.5 shrink-0 text-gray-300 hover:text-critical"
              title="Remove"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => onChange([...people, { ...EMPTY_PARTY }])}
        className="mt-2 flex items-center gap-1 rounded-input border border-dashed border-bordergray px-2.5 py-1.5 text-[12px] text-gray-400 hover:text-indigo"
      >
        <Plus size={13} /> Add person
      </button>
    </div>
  );
}

export default function RoleDrawer({ role, open, onClose, onSave }: Props) {
  const [draft, setDraft] = useState(role ? { ...role } : { id: "", projectId: "", ...emptyDraft() });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(role ? { ...role } : { id: "", projectId: "", ...emptyDraft() });
    }
  }, [open, role]);

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-full w-[440px] flex-col bg-white shadow-panel">
        <div className="flex shrink-0 items-center justify-between border-b border-bordergray px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">
            {role ? "Edit workstream" : "New workstream"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="scroll-thin flex-1 overflow-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelCls}>Workstream name</label>
              <input
                className={inputCls}
                value={draft.workstream}
                onChange={(e) => setDraft({ ...draft, workstream: e.target.value })}
              />
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>

            <div>
              <label className={labelCls}>Accountable</label>
              <PartyFields
                party={draft.accountable}
                onChange={(p) => setDraft({ ...draft, accountable: p })}
              />
            </div>

            <PartyListEditor
              label="Consulted"
              people={draft.consulted}
              onChange={(p) => setDraft({ ...draft, consulted: p })}
            />

            <ClearablePartyField
              label="Responsible – customer"
              party={draft.responsibleCustomer}
              onChange={(p) => setDraft({ ...draft, responsibleCustomer: p })}
            />

            <ClearablePartyField
              label="Responsible – contractor"
              party={draft.responsibleContractor}
              onChange={(p) => setDraft({ ...draft, responsibleContractor: p })}
            />

            <PartyListEditor
              label="Informed – customer"
              people={draft.informedCustomer}
              onChange={(p) => setDraft({ ...draft, informedCustomer: p })}
            />

            <PartyListEditor
              label="Informed – contractor"
              people={draft.informedContractor}
              onChange={(p) => setDraft({ ...draft, informedContractor: p })}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-bordergray px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-btn border border-bordergray px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-btn bg-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-indigo/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
