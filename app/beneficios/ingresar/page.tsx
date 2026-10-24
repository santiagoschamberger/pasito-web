import { redirect } from "next/navigation";
import { getViewer } from "@/lib/catalogo-online/supabase/server";
import { safeReturnPath } from "@/lib/catalogo-online/domain";
import { localTest } from "@/lib/catalogo-online/supabase/config";
import { LoginForm } from "@/components/catalogo-online/login-form";
import { Icon } from "@/components/catalogo-online/icon";
export const metadata = { title: "Ingresar" };
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const query = await searchParams;
  const next = safeReturnPath(query.next);
  if (await getViewer()) redirect(next);
  return (
    <div className="container login-layout">
      <section className="login-story">
        <Icon name="bag" size={64} />
        <h2>
          Tus pasos
          <br />
          abren puertas<span>.</span>
        </h2>
        <p>
          Entrá, elegí tu beneficio
          <br />y llevá tus Pasitos de compras.
        </p>
        <span className="story-note">Un pequeño paso. Un gran mimo.</span>
      </section>
      <LoginForm
        next={next}
        local={localTest}
        callbackError={Boolean(query.error)}
      />
    </div>
  );
}
