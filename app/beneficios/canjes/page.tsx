import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/catalogo-online/supabase/server";
import { getCoupons } from "@/lib/catalogo-online/data";
import { number } from "@/lib/catalogo-online/domain";
import { Icon } from "@/components/catalogo-online/icon";
export const metadata = { title: "Mis canjes" };
export default async function HistoryPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/beneficios/ingresar?next=/beneficios/canjes");
  const coupons = await getCoupons(viewer.user.id);
  return (
    <div className="container history-page">
      <h1>Mis canjes</h1>
      <p className="muted">
        Tus códigos, siempre a mano para tu próxima compra online.
      </p>
      {coupons.length ? (
        <div className="history-list">
          {coupons.map((c) => (
            <Link
              href={`/beneficios/canjes/${c.id}`}
              key={c.id}
              className="history-card"
            >
              <span className="history-icon">
                <Icon name="ticket" size={29} />
              </span>
              <div>
                <p className="product-brand">{c.partner.name}</p>
                <h2>{c.reward.title}</h2>
                <p className="small muted">
                  {new Date(c.used_at).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  · {number(c.pasitos_spent)} Pasitos
                </p>
              </div>
              <span className="view-coupon">
                Ver código
                <Icon name="outward" size={20} />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Icon name="gift" size={46} />
          <h2>Tu primer canje te está esperando.</h2>
          <p>Elegí algo que te guste y disfrutá lo que caminaste.</p>
          <Link href="/beneficios" className="button">
            Explorar tiendas
            <Icon name="right" size={19} />
          </Link>
        </div>
      )}
    </div>
  );
}
