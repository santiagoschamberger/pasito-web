import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/catalogo-online/supabase/server";
import { getPasitosDetail } from "@/lib/catalogo-online/pasitos-data";
import { dayLabel, visibleDays } from "@/lib/catalogo-online/pasitos";
import { number } from "@/lib/catalogo-online/domain";
import { Icon } from "@/components/catalogo-online/icon";

export const metadata = { title: "Tus Pasitos" };
export default async function PasitosPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/beneficios/ingresar?next=/beneficios/pasitos");
  if (!viewer.profile) throw new Error("Saldo no disponible");
  const days = visibleDays((await searchParams).dias);
  const detail = await getPasitosDetail(viewer.user.id, days);
  const dates = [...new Set(detail.movements.map((m) => m.day))];
  return (
    <div className="container pasitos-page">
      <div className="pasitos-heading">
        <Link
          href="/beneficios"
          className="pasitos-back"
          aria-label="Volver a tiendas"
        >
          <Icon name="left" size={20} />
        </Link>
        <h1>Tus Pasitos</h1>
      </div>
      <section className="pasitos-balance-card" aria-label="Saldo de Pasitos">
        <p className="muted">Disponibles para disfrutar</p>
        <div className="pasitos-balance-main">
          <img
            src="/beneficios-assets/brand/pasito-coin.svg"
            width="44"
            height="44"
            alt=""
          />
          <strong className="pasitos-total">
            {number(viewer.profile.pasitos_balance)}
          </strong>
          <span className="pasitos-earned">
            ¡Ganaste {number(detail.earnedToday)}{" "}
            {detail.earnedToday === 1 ? "Pasito" : "Pasitos"} hoy!
          </span>
        </div>
        {detail.expiry && <p className="pasitos-expiry">{detail.expiry}</p>}
      </section>
      <div className="pasitos-walking-note">
        <img
          src="/beneficios-assets/brand/pasito-coin.svg"
          width="24"
          height="24"
          alt=""
        />
        <p>
          Seguí sumando pasos con la app.
          <br />
          <span>Acá podés disfrutar tus Pasitos en tus tiendas favoritas.</span>
        </p>
      </div>
      <section className="pasitos-movements" aria-labelledby="movements-title">
        <div className="pasitos-section-title">
          <h2 id="movements-title">Movimientos</h2>
          <span className="muted">Últimos {days} días</span>
        </div>
        {dates.length ? (
          dates.map((date) => (
            <section
              className="pasitos-day"
              key={date}
              aria-label={dayLabel(date, detail.today)}
            >
              <h3>{dayLabel(date, detail.today)}</h3>
              <ul className="pasitos-movement-list">
                {detail.movements
                  .filter((m) => m.day === date)
                  .map((m) => (
                    <li key={m.id}>
                      <div>
                        <p className="small muted">{m.detail}</p>
                        <p className="movement-title">{m.title}</p>
                      </div>
                      <span
                        className={`movement-amount ${m.amount > 0 ? "positive" : "negative"}`}
                        aria-label={`${m.amount > 0 ? "Ganaste" : "Usaste"} ${number(Math.abs(m.amount))} Pasitos`}
                      >
                        <img
                          src="/beneficios-assets/brand/pasito-coin.svg"
                          alt=""
                          width="18"
                          height="18"
                        />
                        {m.amount > 0 ? "+" : "−"}
                        {number(Math.abs(m.amount))}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          ))
        ) : (
          <div className="empty-state">
            <img
              src="/beneficios-assets/brand/pasito-coin.svg"
              width="40"
              height="40"
              alt=""
            />
            <h3>Todavía no tenés movimientos en este período</h3>
            <p>Tus Pasitos ganados y canjeados van a aparecer acá.</p>
          </div>
        )}
        {detail.canLoadMore && (
          <Link
            href={`/beneficios/pasitos?dias=${days + 30}`}
            scroll={false}
            className="button secondary pasitos-more"
          >
            Ver 30 días más
          </Link>
        )}
      </section>
    </div>
  );
}
