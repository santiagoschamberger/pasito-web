import Link from "next/link";
import { getViewer } from "@/lib/catalogo-online/supabase/server";
import { localTest } from "@/lib/catalogo-online/supabase/config";
import { number } from "@/lib/catalogo-online/domain";
import { Icon } from "./icon";
import { SignOut } from "./sign-out";
export async function Header() {
  const viewer = await getViewer();
  return (
    <>
      {localTest && (
        <div className="test-notice">
          Entorno de prueba · Saldo, tiendas y cupones ficticios
        </div>
      )}
      <div className="brand-strip">Cada paso tiene su recompensa.</div>
      <header className="site-header">
        <div className="header-inner container">
          <Link
            href="/beneficios"
            className="wordmark"
            aria-label="Pasito · Ir a tiendas online"
          >
            <img
              src="/beneficios-assets/brand/pasito.svg"
              alt="Pasito"
              width="110"
              height="34"
            />
          </Link>
          <nav className="desktop-nav" aria-label="Principal">
            <Link href="/beneficios">Tiendas online</Link>
            <Link href="/beneficios/canjes">
              <Icon name="gift" size={19} />
              Mis canjes
            </Link>
          </nav>
          <div className="account-actions">
            {viewer ? (
              <>
                {viewer.profile ? (
                  <span className="balance-summary">
                    <span className="balance-label">Tus Pasitos</span>
                    <Link
                      href="/beneficios/pasitos"
                      prefetch={false}
                      className="balance"
                      aria-label={`Ver mis Pasitos: ${number(viewer.profile.pasitos_balance)} disponibles`}
                    >
                      <img
                        src="/beneficios-assets/brand/pasito-coin.svg"
                        alt=""
                        width="24"
                        height="24"
                      />
                      <span>{number(viewer.profile.pasitos_balance)}</span>
                    </Link>
                  </span>
                ) : (
                  <span className="muted">Saldo no disponible</span>
                )}
                <SignOut />
              </>
            ) : (
              <Link href="/beneficios/ingresar" className="account-link">
                <Icon name="user" />
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </header>
      <nav className="mobile-nav container" aria-label="Principal móvil">
        <Link href="/beneficios">
          <Icon name="store" size={19} />
          Tiendas online
        </Link>
        <Link href="/beneficios/canjes">
          <Icon name="gift" size={19} />
          Mis canjes
        </Link>
      </nav>
    </>
  );
}
