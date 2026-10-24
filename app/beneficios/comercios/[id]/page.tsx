import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalogo-online/data";
import {
  categoryName,
  safeStoreUrl,
  number,
} from "@/lib/catalogo-online/domain";
import { getViewer } from "@/lib/catalogo-online/supabase/server";
import { localTest } from "@/lib/catalogo-online/supabase/config";
import { Icon } from "@/components/catalogo-online/icon";
import { ProductCard } from "@/components/catalogo-online/product-card";
import { StoreAvatar } from "@/components/catalogo-online/store-avatar";

async function getStore(id: string) {
  const viewer = await getViewer();
  const catalog = await getCatalog(viewer?.profile?.country_code ?? "AR");
  const rewards = catalog.filter((reward) => reward.partner_id === id);
  if (!rewards.length) notFound();
  return { rewards, catalog, partner: rewards[0].partner };
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { partner } = await getStore((await params).id);
  return { title: `${partner.name} · Tiendas` };
}
export default async function MerchantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { rewards, catalog, partner } = await getStore(id);
  const categories = [
    ...new Set(rewards.map((reward) => categoryName(reward.category))),
  ];
  const storeUrl = safeStoreUrl(partner.online_store_url ?? null, localTest);
  const related = catalog
    .filter((reward) => reward.partner_id !== id)
    .slice(0, 3);
  const featured = rewards.length === 1 ? rewards[0] : null;
  return (
    <div className="container merchant-page">
      <Link className="back-link" href="/beneficios">
        <Icon name="left" size={18} />
        Todas las tiendas
      </Link>
      <header className="merchant-heading">
        <StoreAvatar name={partner.name} logoUrl={partner.logo_url} large />
        <div className="merchant-identity">
          <h1>{partner.name}</h1>
          <p className="merchant-meta">
            <Icon name="store" size={16} />
            Tienda online<span aria-hidden="true">·</span>
            {categories.join(" · ")}
          </p>
        </div>
        {storeUrl && (
          <a
            className="button secondary"
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visitar tienda online
            <Icon name="outward" size={16} />
          </a>
        )}
      </header>
      <section className="merchant-benefits" aria-labelledby="benefits-heading">
        <div className="merchant-section-heading">
          <h2 id="benefits-heading">Beneficios</h2>
          <span>
            {rewards.length} {rewards.length === 1 ? "beneficio" : "beneficios"}
          </span>
        </div>
        {featured ? (
          <article className="merchant-feature">
            <Link
              className="merchant-feature-image"
              href={`/beneficios/${featured.id}`}
              aria-label={`Ver beneficio: ${featured.title}`}
            >
              {featured.image_url ? (
                <img src={featured.image_url} alt="" fetchPriority="high" />
              ) : (
                <div className="image-fallback">
                  <Icon name="bag" size={64} />
                </div>
              )}
            </Link>
            <div className="merchant-feature-info">
              <h3>{featured.title}</h3>
              {featured.description && (
                <p className="merchant-feature-description">
                  {featured.description}
                </p>
              )}
              <p className="merchant-feature-price">
                <Icon name="ticket" size={22} />
                <strong>{number(featured.pasitos_cost)}</strong>
                <span>Pasitos</span>
              </p>
              <Link href={`/beneficios/${featured.id}`} className="button">
                Ver beneficio
                <Icon name="right" size={16} />
              </Link>
              <p className="small">
                {featured.redemption_mode === "shared_code"
                  ? "Próximamente"
                  : featured.remaining_stock === 0 ||
                      featured.external_code_available_count === 0
                    ? "Sin stock por el momento"
                    : "Canjeá tus Pasitos y usá el código en la tienda."}
              </p>
            </div>
          </article>
        ) : (
          <div className="product-grid">
            {rewards.map((reward) => (
              <ProductCard key={reward.id} reward={reward} />
            ))}
          </div>
        )}
      </section>
      <details className="merchant-help">
        <summary>
          <Icon name="ticket" size={20} />
          Cómo usar tus beneficios
          <Icon name="right" size={18} />
        </summary>
        <ol>
          <li>Elegí un beneficio y revisá sus condiciones.</li>
          <li>Canjealo con tus Pasitos y copiá tu código.</li>
          <li>Aplicalo al finalizar tu compra en la tienda online.</li>
        </ol>
        {partner.online_redemption_instructions && (
          <p>{partner.online_redemption_instructions}</p>
        )}
        <p>
          Tu código queda guardado en Mis canjes para que lo consultes cuando
          quieras.
        </p>
      </details>
      {related.length > 0 && (
        <section className="merchant-related" aria-labelledby="related-heading">
          <div className="merchant-section-heading">
            <h2 id="related-heading">Más tiendas para descubrir</h2>
            <Link href="/beneficios">
              Ver todas
              <Icon name="right" size={18} />
            </Link>
          </div>
          <div className="product-grid">
            {related.map((reward) => (
              <ProductCard key={reward.id} reward={reward} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
