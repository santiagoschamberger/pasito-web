import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/catalogo-online/header";
import "./catalogo.css";
import { hasCatalogConfig } from "@/lib/catalogo-online/supabase/config";
export const metadata: Metadata = {
  title: { default: "Pasito · Tiendas online", template: "%s · Pasito" },
  robots: { index: false, follow: true },
  description:
    "Tus pasos se convierten en beneficios. Elegí tu tienda online, canjeá tus Pasitos y disfrutá tu próxima compra.",
};
export const dynamic = "force-dynamic";
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!hasCatalogConfig()) return children;
  return (
    <div className="online-storefront" lang="es-AR">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido">{children}</main>
      <footer className="site-footer container">
        <div>
          <Link
            href="/beneficios"
            aria-label="Pasito"
            className="footer-wordmark"
          >
            <img
              src="/beneficios-assets/brand/pasito.svg"
              width="85"
              height="20.2464"
              alt="Pasito"
            />
          </Link>
          <p>
            Cada paso cuenta.
            <br />
            Cada canje también.
          </p>
        </div>
        <div>
          <strong>De tus pasos a tus marcas favoritas.</strong>
          <p>
            Elegí un beneficio. Canjeá tus Pasitos.
            <br />
            Usá tu código en la tienda online.
          </p>
        </div>
        <Link href="/beneficios/canjes">Ver mis canjes</Link>
      </footer>
    </div>
  );
}
