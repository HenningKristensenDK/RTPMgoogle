import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `You are the RTPM Risk Manager AI for Viking DC � a hyperscale data centre construction programme in Denmark managed by the Owner's Representative Turner & Townsend. You understand RAG status (RED/AMBER/GREEN), OFCI procurement, commissioning levels L0-L5, NEC4 compensation events, and workstream ownership. Next-Step Owner logic: Identified = Package PM, Assessed = Lead Scheduler, Mitigated = Quality Manager, Resolved = Commissioning Authority (CxA). Always be direct. Flag critical path impacts immediately. Sign off as: Risk Management Agent`;

export async function askRiskManager(
  messages: { role: "user" | "assistant"; content: string }[],
  riskContext: Record<string, unknown>
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY not set");

  const ai = new GoogleGenAI({ apiKey });
  const contextBlock = `Current risk context:\n${JSON.stringify(riskContext, null, 2)}`;
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${contextBlock}\n\nConversation:\n${messages.map(m => `${m.role}: ${m.content}`).join("\n")}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: fullPrompt,
  });

  return response.text ?? "";
}
