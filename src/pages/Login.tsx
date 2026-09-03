import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { login, register } from "../firebase/auth";
import { toast } from "../lib/toast";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      toast.error(message.replace("Firebase: ", ""));
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-input border border-bordergray px-3 py-2 text-sm outline-none focus:border-indigo focus:ring-1 focus:ring-indigo";

  return (
    <div className="flex h-full items-center justify-center bg-fog px-4">
      <div className="w-full max-w-sm rounded-card bg-white p-8 shadow-panel">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-card bg-indigo text-white">
            <ShieldAlert size={24} />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-ink">Viking Project</h1>
            <p className="text-xs text-gray-400">Sign in to RTPM Platform</p>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "register" && (
            <input
              className={inputCls}
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            className={inputCls}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={inputCls}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-btn bg-indigo py-2 text-sm font-semibold text-white hover:bg-indigo/90 disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-gray-500">
          {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
          <button
            className="font-semibold text-indigo hover:underline"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
