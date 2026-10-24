import Link from "next/link";
import { number, type StoreReward } from "@/lib/catalogo-online/domain";
import { Icon } from "./icon";
import { StoreAvatar } from "./store-avatar";

export function ProductCard({ reward: r }: { reward: StoreReward }) {
  const unavailable =
    r.remaining_stock === 0 || r.external_code_available_count === 0;
  return (
    <article className="product-card">
      <div className="product-media">
        <Link
          href={`/beneficios/${r.id}`}
          className="product-image"
          aria-label={`Ver beneficio: ${r.title}`}
        >
          {r.image_url ? (
            <img src={r.image_url} alt="" loading="lazy" />
          ) : (
            <div className="image-fallback">
              <Icon name="bag" size={52} />
            </div>
          )}
          {(r.redemption_mode === "shared_code" || unavailable) && (
            <span className="product-badge">
              {r.redemption_mode === "shared_code"
                ? "Próximamente"
                : "Sin stock"}
            </span>
          )}
          <span className="product-arrow">
            <Icon name="right" size={21} />
          </span>
        </Link>
        <Link
          href={`/beneficios/comercios/${r.partner_id}`}
          className="product-avatar-link"
          aria-label={`Ver tienda ${r.partner.name}`}
          title={r.partner.name}
        >
          <StoreAvatar name={r.partner.name} logoUrl={r.partner.logo_url} />
        </Link>
      </div>
      <div className="product-info">
        <h3>
          <Link href={`/beneficios/${r.id}`}>{r.title}</Link>
        </h3>
        <p className="product-price">
          {number(r.pasitos_cost)} <span>Pasitos</span>
          <Icon name="ticket" size={17} />
        </p>
        <Link
          href={`/beneficios/comercios/${r.partner_id}`}
          className="product-merchant"
          aria-label={`Más de ${r.partner.name}`}
        >
          <span>{r.partner.name}</span>
          <Icon name="right" size={16} />
        </Link>
      </div>
    </article>
  );
}
