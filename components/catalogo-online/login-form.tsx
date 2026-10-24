"use client";
import { useState } from "react";
import { browserClient } from "@/lib/catalogo-online/supabase/browser";
import { Icon } from "./icon";
export function LoginForm({
  next,
  local,
  callbackError,
}: {
  next: string;
  local: boolean;
  callbackError: boolean;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    callbackError ? "No pudimos completar el ingreso. Intentá de nuevo." : "",
  );
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const client = browserClient();
      if (!sent) {
        const { error } = await client.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/beneficios/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await client.auth.verifyOtp({
          email: email.trim(),
          token: code,
          type: "email",
        });
        if (error) throw error;
        window.location.assign(next);
      }
    } catch {
      setError(
        sent
          ? "El código no es válido o ya venció. Revisalo o pedí uno nuevo."
          : "No pudimos enviar el código. Revisá tu correo e intentá de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function oauth(provider: "google" | "apple") {
    setBusy(true);
    setError("");
    const { error } = await browserClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/beneficios/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError("No pudimos iniciar el ingreso. Intentá de nuevo.");
      setBusy(false);
    }
  }
  return (
    <div className="login-panel">
      <h1>{sent ? "Revisá tu correo." : "Hola de nuevo."}</h1>
      <p className="login-description">
        {sent
          ? `Enviamos un código de 6 dígitos a ${email}.`
          : "Ingresá para usar tus Pasitos y encontrar tu próxima recompensa."}
      </p>
      {local && (
        <div className="local-login-info">
          Usá <strong>compras@pasito.test</strong> y consultá el código en la{" "}
          <a
            href="http://127.0.0.1:55321/__test/mailbox"
            target="_blank"
            rel="noreferrer"
          >
            bandeja local de prueba ↗
          </a>
          . La entrega y validación OTP son simuladas.
        </div>
      )}
      <form onSubmit={submit}>
        {!sent ? (
          <label className="form-label" htmlFor="email">
            Tu correo electrónico
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="vos@ejemplo.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </label>
        ) : (
          <label className="form-label" htmlFor="otp">
            Código de verificación
            <input
              id="otp"
              className="otp-input"
              name="otp"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              minLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={busy}
            />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button full" type="submit" disabled={busy}>
          {busy
            ? "Un momento…"
            : sent
              ? "Verificar e ingresar"
              : "Continuar con email"}
          <Icon name="right" size={19} />
        </button>
        {sent && (
          <button
            className="text-button"
            type="button"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setCode("");
              setError("");
            }}
          >
            Cambiar correo o pedir otro código
          </button>
        )}
      </form>
      {!sent && (
        <>
          <div className="login-divider">
            <span>o continuá con</span>
          </div>
          <div className="oauth-buttons">
            <button
              className="button secondary"
              disabled={local || busy}
              onClick={() => oauth("google")}
            >
              <Icon name="google" size={20} />
              Google
            </button>
            <button
              className="button secondary"
              disabled={local || busy}
              onClick={() => oauth("apple")}
            >
              <Icon name="apple" size={20} />
              Apple
            </button>
          </div>
          {local && (
            <p className="small muted">
              Google y Apple necesitan sus proveedores configurados; la prueba
              local usa email.
            </p>
          )}
        </>
      )}
      <p className="login-footnote">
        <Icon name="check" size={18} />
        La misma cuenta y los mismos Pasitos de la app.
      </p>
    </div>
  );
}
