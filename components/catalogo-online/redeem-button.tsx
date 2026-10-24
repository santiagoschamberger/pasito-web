"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { redeemReward } from "@/app/beneficios/actions";
import { number } from "@/lib/catalogo-online/domain";
import { Icon } from "./icon";
export function RedeemButton({
  rewardId,
  userId,
  cost,
  balance,
  available,
}: {
  rewardId: string;
  userId: string;
  cost: number;
  balance: number | null;
  available: boolean;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");
  const lock = useRef(false);
  const canAfford = balance !== null && balance >= cost;
  async function redeem() {
    if (lock.current) return;
    lock.current = true;
    setError("");
    try {
      // Persist across timeouts/reloads. Retrying the same intent must never
      // allocate a second coupon or debit the balance a second time.
      const storageKey = `pasito:canje:${userId}:${rewardId}`;
      let key = sessionStorage.getItem(storageKey);
      if (!key) {
        key = crypto.randomUUID();
        sessionStorage.setItem(storageKey, key);
      }
      const result = await redeemReward(rewardId, key);
      if (result.error) setError(result.error);
      else if (result.couponId) {
        router.push(`/beneficios/canjes/${result.couponId}`);
        router.refresh();
        return;
      }
    } catch {
      setError(
        "Se interrumpió la conexión. Podés reintentar sin duplicar el descuento de Pasitos.",
      );
    } finally {
      lock.current = false;
    }
  }
  return (
    <div className="redeem-section">
      {!confirm ? (
        <button
          className="button full"
          disabled={!available || !canAfford}
          onClick={() => setConfirm(true)}
        >
          {!available
            ? "Sin stock disponible"
            : balance === null
              ? "Saldo no disponible"
              : !canAfford
                ? "Te faltan Pasitos"
                : "Canjear beneficio"}
          <Icon name="right" size={20} />
        </button>
      ) : (
        <div className="confirm-box">
          <h3>¿Confirmás el canje?</h3>
          <p>
            Vas a usar <strong>{number(cost)} Pasitos</strong>. Tu código
            quedará guardado en Mis canjes.
          </p>
          <button
            className="button full"
            onClick={() => startTransition(redeem)}
            disabled={busy}
          >
            {busy
              ? "Confirmando canje…"
              : `Confirmar · ${number(cost)} Pasitos`}
          </button>
          <button
            className="text-button"
            onClick={() => {
              setConfirm(false);
              setError("");
            }}
            disabled={busy}
          >
            Volver al beneficio
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!confirm && canAfford && available && (
        <p className="small muted">
          Después del canje te quedan {number(balance! - cost)} Pasitos.
        </p>
      )}
    </div>
  );
}
