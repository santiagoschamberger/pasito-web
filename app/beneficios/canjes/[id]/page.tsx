import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/catalogo-online/supabase/server";
import { getCoupons } from "@/lib/catalogo-online/data";
import { safeStoreUrl, number } from "@/lib/catalogo-online/domain";
import { localTest } from "@/lib/catalogo-online/supabase/config";
import { Icon } from "@/components/catalogo-online/icon";
import { StoreAvatar } from "@/components/catalogo-online/store-avatar";
import { CouponCode } from "@/components/catalogo-online/coupon-code";
export const metadata = { title: "Tu código" };
export default async function CouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/beneficios/ingresar?next=/beneficios/canjes");
  const { id } = await params;
  const coupon = (await getCoupons(viewer.user.id)).find((c) => c.id === id);
  if (!coupon) notFound();
  const url = safeStoreUrl(coupon.reward.redemption_url, localTest);
  return (
    <div className="container receipt-page">
      <Link className="back-link" href="/beneficios/canjes">
        <Icon name="left" size={18} />
        Mis canjes
      </Link>
      <section className="receipt" aria-labelledby="success-heading">
        <div className="receipt-celebration">
          <div className="receipt-hero" aria-hidden="true">
            <img
              className="receipt-hero-background"
              src="/beneficios-assets/brand/reward-success-background.png"
              alt=""
            />
            <img
              className="receipt-bird"
              src="/beneficios-assets/brand/redeem-success-bird.svg"
              width="200"
              height="251"
              alt=""
            />
          </div>
          <h1 id="success-heading">¡Ya canjeaste tu premio!</h1>
          <p className="receipt-subtitle">
            Te lo ganaste caminando. ¡A disfrutarlo!
          </p>
        </div>
        <div className="receipt-content">
          <div className="receipt-reward">
            <StoreAvatar
              name={coupon.partner.name}
              logoUrl={coupon.partner.logo_url}
            />
            <div>
              <p>{coupon.partner.name}</p>
              <h2>{coupon.reward.title}</h2>
            </div>
            <Icon name="check" size={22} />
          </div>
          {coupon.external_redemption_code && (
            <CouponCode code={coupon.external_redemption_code} />
          )}
          <p className="receipt-instructions">
            {coupon.reward.redemption_instructions ||
              "Usá este código al finalizar tu compra en la tienda online."}
          </p>
          {url && (
            <a
              className="button full"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ir a la tienda
              <Icon name="outward" size={16} />
            </a>
          )}
          <div className="receipt-totals">
            <p className="receipt-balance">
              <span>Pasitos utilizados</span>
              <strong>{number(coupon.pasitos_spent)}</strong>
            </p>
            <p className="receipt-balance">
              <span>Tu saldo actual</span>
              <strong>
                {viewer.profile
                  ? `${number(viewer.profile.pasitos_balance)} Pasitos`
                  : "No disponible"}
              </strong>
            </p>
          </div>
          <p className="small muted saved-note">
            <Icon name="gift" size={18} />
            Tu código quedó guardado en Mis canjes.
          </p>
          <Link className="text-button" href="/beneficios">
            Seguir explorando tiendas
            <Icon name="right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
