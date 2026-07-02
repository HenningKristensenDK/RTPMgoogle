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
  const slots: [string, "accountable" | "consulted" | "responsibleCustomer" | "responsibleContractor" | "informedCustomer" | "informedContractor"][] = [
    ["Accountable", "accountable"],
    ["Consulted", "consulted"],
    ["Responsible (Customer)", "responsibleCustomer"],
    ["Responsible (Contractor)", "responsibleContractor"],
    ["Informed (Customer)", "informedCustomer"],
    ["Informed (Contractor)", "informedContractor"],
  ];
  const involvedParties = involved.flatMap((r) =>
    slots
      .map(([raci, key]) => {
        const party = r[key];
        return party ? { workstream: r.workstream, organization: party.organization, role: party.role, person: party.name, raci } : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
  );
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
