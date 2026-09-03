import { httpsCallable } from "firebase/functions";
import { functions } from "./config";
import type { Risk, RoleResponsibility } from "../types";

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentRequest {
  messages: AgentMessage[];
  riskContext: Record<string, unknown>;
}

interface AgentResponse {
  content: string;
}

const callAgent = httpsCallable<AgentRequest, AgentResponse>(
  functions,
  "riskManagerAgent"
);

/** Build a compact, AI-friendly context block from the current risk record. */
export function buildRiskContext(
  risk: Risk,
  roles: RoleResponsibility[]
): Record<string, unknown> {
  const involved = roles.filter((r) => risk.workstreamIds.includes(r.id));
  const involvedParties = involved.flatMap((r) => {
    const entries: { workstream: string; organization: string; role: string; person: string; raci: string }[] = [];
    const single: [string, typeof r.accountable | null][] = [
      ["Accountable", r.accountable],
      ["Responsible (Customer)", r.responsibleCustomer],
      ["Responsible (Contractor)", r.responsibleContractor],
    ];
    for (const [raci, party] of single) {
      if (party) entries.push({ workstream: r.workstream, organization: party.organization, role: party.role, person: party.name, raci });
    }
    const lists: [string, typeof r.informedCustomer][] = [
      ["Consulted", r.consulted],
      ["Informed (Customer)", r.informedCustomer],
      ["Informed (Contractor)", r.informedContractor],
    ];
    for (const [raci, parties] of lists) {
      for (const party of parties) {
        entries.push({ workstream: r.workstream, organization: party.organization, role: party.role, person: party.name, raci });
      }
    }
    return entries;
  });
  return {
    riskId: risk.riskId,
    title: risk.title,
    status: risk.status,
    priority: risk.priority,
    recurrence: risk.recurrence,
    dueDate: risk.dueDate ? risk.dueDate.toDate().toISOString() : null,
    notes: risk.notes,
    checklist: risk.checklist.map((c) => ({ text: c.text, done: c.completed })),
    involvedParties,
    statusHistory: risk.statusHistory.map((h) => ({
      from: h.from,
      to: h.to,
      comment: h.comment,
    })),
  };
}

export async function askRiskManager(
  messages: AgentMessage[],
  riskContext: Record<string, unknown>
): Promise<string> {
  const res = await callAgent({ messages, riskContext });
  return res.data.content;
}
