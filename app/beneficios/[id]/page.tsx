import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalogo-online/data";
import { getViewer } from "@/lib/catalogo-online/supabase/server";
import { serverClient } from "@/lib/catalogo-online/supabase/server";
import { number, type StoreReward } from "@/lib/catalogo-online/domain";
import { Icon } from "@/components/catalogo-online/icon";
import { StoreAvatar } from "@/components/catalogo-online/store-avatar";
import { RedeemButton } from "@/components/catalogo-online/redeem-button";
export default async function RewardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getViewer();
  let reward = (await getCatalog(viewer?.profile?.country_code ?? "AR")).find(
    (r) => r.id === id,
  );
  if (!reward) notFound();
  if (viewer) {
    const client = await serverClient();
    const detail = await client.rpc("get_reward_detail_with_availability", {
      p_reward_id: id,
    });
    if (detail.error)
      throw new Error("No pudimos actualizar la disponibilidad.");
    if (!detail.data || detail.data.kind !== "web") notFound();
    reward = { ...reward, ...detail.data } as StoreReward;
  }
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const available =
    reward.remaining_stock !== 0 &&
    reward.external_code_available_count > 0 &&
    reward.daily_remaining !== 0 &&
    (!reward.stock_paused_until || reward.stock_paused_until < today);
  return (
    <div className="container detail-page">
      <Link className="back-link" href="/beneficios">
        <Icon name="left" size={18} />
        Volver a tiendas online
      </Link>
      <div className="detail-layout">
        <div className="detail-image">
          {reward.image_url ? (
            <img src={reward.image_url} alt={reward.partner.name} />
          ) : (
            <Icon name="bag" size={80} />
          )}
        </div>
        <section className="detail-info">
          <Link
            className="detail-merchant"
            href={`/beneficios/comercios/${reward.partner_id}`}
          >
            <StoreAvatar
              name={reward.partner.name}
              logoUrl={reward.partner.logo_url}
            />
            <span>
              {reward.partner.name}
              <small>Ver tienda</small>
            </span>
            <Icon name="right" size={18} />
          </Link>
          <h1>{reward.title}</h1>
          <p className="detail-description">{reward.description}</p>
          <p className="detail-price">
            <Icon name="ticket" size={26} />
            {number(reward.pasitos_cost)} <span>Pasitos</span>
          </p>
          <p className="stock-label">
            <span className={available ? "stock-dot" : "stock-dot empty"} />
            {available
              ? "Códigos disponibles · Uso online"
              : "Sin stock por el momento"}
          </p>
          {reward.redemption_mode !== "external_code" ? (
            <p className="notice">
              Este beneficio estará disponible próximamente.
            </p>
          ) : viewer ? (
            <RedeemButton
              rewardId={id}
              userId={viewer.user.id}
              cost={reward.pasitos_cost}
              balance={viewer.profile?.pasitos_balance ?? null}
              available={available}
            />
          ) : (
            <Link
              className="button full"
              href={`/beneficios/ingresar?next=${encodeURIComponent("/beneficios/" + id)}`}
            >
              Ingresar para canjear
              <Icon name="right" size={20} />
            </Link>
          )}
          <div className="detail-instructions">
            <h2>Así lo disfrutás</h2>
            <ol>
              <li>Canjeá el beneficio con tus Pasitos.</li>
              <li>Copiá el código que te vamos a dar.</li>
              <li>Aplicalo al finalizar tu compra en la tienda online.</li>
            </ol>
            {reward.redemption_instructions && (
              <p>{reward.redemption_instructions}</p>
            )}
          </div>
          <details className="conditions">
            <summary>Condiciones del beneficio</summary>
            <p>
              {reward.conditions ||
                "Consultá las condiciones y la disponibilidad antes de confirmar tu canje."}
            </p>
            <p>
              El código queda guardado en Mis canjes para que puedas consultarlo
              después.
            </p>
          </details>
        </section>
      </div>
    </div>
  );
}
