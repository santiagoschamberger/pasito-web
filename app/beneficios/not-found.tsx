import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>Este beneficio no está disponible</h1>
      <p>Encontrá tu próxima recompensa en las tiendas online.</p>
      <Link className="button" href="/beneficios">
        Explorar tiendas
      </Link>
    </div>
  );
}
