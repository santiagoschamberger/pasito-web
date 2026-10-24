"use client";
import Link from "next/link";
export default function PasitosError({ reset }: { reset: () => void }) {
  return (
    <div className="container empty-state">
      <h1>No pudimos cargar tus Pasitos</h1>
      <p>Reintentá para ver tu saldo y tus movimientos actualizados.</p>
      <button className="button" onClick={reset}>
        Reintentar
      </button>
      <Link href="/beneficios" className="text-button">
        Volver a tiendas
      </Link>
    </div>
  );
}
