"use client";
import { useState } from "react";
import { Icon } from "./icon";
export function CouponCode({ code }: { code: string }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Código copiado");
    } catch {
      setMessage("Seleccioná el código para copiarlo manualmente.");
    }
  }
  return (
    <div className="coupon-code-box">
      <p className="coupon-label">Tu código de descuento</p>
      <div className="coupon-code-row">
        <code>{code}</code>
        <button
          className="icon-button"
          onClick={copy}
          aria-label="Copiar código"
          title="Copiar código"
        >
          <Icon name="copy" />
        </button>
      </div>
      <p className="small" role="status">
        {message || "Copialo y aplicalo al finalizar tu compra."}
      </p>
    </div>
  );
}
