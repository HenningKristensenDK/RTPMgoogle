import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenAI } from "@google/genai";

// Store the key as a Functions secret:
//   firebase functions:secrets:set GEMINI_API_KEY
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const SYSTEM_PROMPT = `You are the RTPM Risk Manager AI for Viking DC — a hyperscale data centre construction programme in Denmark managed by the Customer's PMO. You understand RAG status (RED/AMBER/GREEN), OFCI procurement, commissioning levels L0-L5, NEC4 compensation events, and workstream ownership. Next-Step Owner logic: Identified = Package PM, Assessed = Lead Scheduler, Mitigated = Quality Manager, Resolved = Commissioning Authority (CxA). Always be direct. Flag critical path impacts immediately. Sign off as: Risk Management Agent`;

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentRequest {
  messages: AgentMessage[];
  riskContext: Record<string, unknown>;
}

export const riskManagerAgent = onCall<AgentRequest>(
  { secrets: [GEMINI_API_KEY], cors: true, enforceAppCheck: false },
  async (request) => {
    // Require an authenticated caller.
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to use Risk Manager."
      );
    }

    const { messages, riskContext } = request.data || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError("invalid-argument", "messages array is required.");
    }

    // This key is a Vertex AI Express Mode key (bound to a service account),
    // not a plain Generative Language API key — it only works via Vertex.
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value(), vertexai: true });

    const contextBlock = `Current risk context:\n${JSON.stringify(
      riskContext ?? {},
      null,
      2
    )}`;
    const fullPrompt = `${SYSTEM_PROMPT}\n\n${contextBlock}\n\nConversation:\n${messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n")}`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
      });

      return { content: response.text ?? "" };
    } catch (err) {
      console.error("Gemini request failed", err);
      throw new HttpsError(
        "internal",
        "Risk Manager could not generate a response."
      );
    }
  }
);
