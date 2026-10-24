"use client";
import { useState } from "react";
import { browserClient } from "@/lib/catalogo-online/supabase/browser";
import { Icon } from "./icon";
export function SignOut() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function signOut() {
    setBusy(true);
    setError(false);
    const { error } = await browserClient().auth.signOut();
    if (error) {
      setError(true);
      setBusy(false);
      return;
    }
    window.location.assign("/beneficios");
  }
  return (
    <>
      <button
        className="icon-button"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={signOut}
        disabled={busy}
      >
        <Icon name="logout" />
      </button>
      {error && <span role="alert">No pudimos cerrar sesión.</span>}
    </>
  );
}
