"use client";
import { useState } from "react";
import type { StoreReward } from "@/lib/catalogo-online/domain";
import { categoryName } from "@/lib/catalogo-online/domain";
import { Icon } from "./icon";
import { ProductCard } from "./product-card";
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function Catalog({
  rewards,
  balance,
}: {
  rewards: StoreReward[];
  balance: number | null;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("featured");
  const [affordable, setAffordable] = useState(false);
  const categories = [...new Set(rewards.map((r) => r.category))].sort();
  const visible = rewards.filter(
    (r) =>
      normalize(`${r.title} ${r.partner.name}`).includes(normalize(query)) &&
      (category === "all" || r.category === category) &&
      (!affordable || balance === null || r.pasitos_cost <= balance),
  );
  if (sort === "cost") visible.sort((a, b) => a.pasitos_cost - b.pasitos_cost);
  if (sort === "name")
    visible.sort((a, b) => a.partner.name.localeCompare(b.partner.name, "es"));
  function clear() {
    setQuery("");
    setCategory("all");
    setAffordable(false);
  }
  return (
    <div className="container catalog-page">
      <section className="store-hero" aria-labelledby="hero-heading">
        <div>
          <h1 id="hero-heading">
            De caminar
            <br />a estrenar<span>.</span>
          </h1>
          <p className="hero-description">
            Tus marcas favoritas, ahora con Pasitos.
          </p>
        </div>
        <div className="hero-aside">
          <Icon name="bag" size={43} />
          <h2>Elegís. Canjeás. Disfrutás.</h2>
          <p>
            Obtené tu código y aplicalo
            <br />
            al comprar en la tienda online.
          </p>
          <a href="#catalogo" className="hero-link">
            Encontrá tu próximo beneficio
            <Icon name="right" size={20} />
          </a>
        </div>
      </section>
      <section id="catalogo" aria-labelledby="catalog-heading">
        <div className="catalog-heading">
          <div>
            <h2 id="catalog-heading">Tiendas online</h2>
            <p>Un mimo para vos. Una recompensa por moverte.</p>
          </div>
          <span className="online-label">
            <span />
            100% online
          </span>
        </div>
        <div className="search-field">
          <Icon name="search" />
          <input
            type="search"
            aria-label="Buscar tienda o beneficio"
            placeholder="Buscar tienda o beneficio"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
              className="icon-button"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        <div className="catalog-layout">
          <div
            className="category-options"
            role="group"
            aria-label="Filtrar por categoría"
          >
            {["all", ...categories].map((c) => (
              <button
                key={c}
                type="button"
                className={category === c ? "category active" : "category"}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c === "all" ? "Todas" : categoryName(c)}
              </button>
            ))}
          </div>
          <div className="catalog-products">
            <div className="results-toolbar">
              <p aria-live="polite">
                {visible.length}{" "}
                {visible.length === 1 ? "beneficio" : "beneficios"} para
                descubrir
              </p>
              <div className="results-controls">
                {balance !== null && (
                  <label className="affordable">
                    <input
                      type="checkbox"
                      checked={affordable}
                      onChange={(e) => setAffordable(e.target.checked)}
                    />
                    Me alcanzan mis Pasitos
                  </label>
                )}
                <label>
                  <span className="sr-only">Ordenar beneficios</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="featured">Ordenar: destacados</option>
                    <option value="cost">Menos Pasitos primero</option>
                    <option value="name">Tienda: A a Z</option>
                  </select>
                </label>
              </div>
            </div>
            {visible.length ? (
              <div className="product-grid">
                {visible.map((r) => (
                  <ProductCard key={r.id} reward={r} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Icon name="search" size={40} />
                <h3>No encontramos beneficios</h3>
                <p>Probá con otra tienda o cambiá los filtros.</p>
                <button className="button secondary" onClick={clear}>
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
