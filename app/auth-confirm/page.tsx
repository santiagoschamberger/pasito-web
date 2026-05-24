import { buildAuthParams, type SearchParams } from "./auth-confirm";

type AuthConfirmPageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata = {
  title: "Abrir Pasito",
};

export default async function AuthConfirmPage({
  searchParams,
}: AuthConfirmPageProps) {
  const params = await searchParams;
  const authParams = buildAuthParams(params);
  const error = stringParam(params.error);

  return (
    <main className="min-h-dvh bg-[#0c6b45] px-6 py-8 text-white">
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[420px] flex-col items-center justify-center text-center">
        <p className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-[#eefa7a]">
          Pasito
        </p>
        <h1 className="mb-4 text-[32px] font-black leading-[1.1] text-white">
          {authParams ? "Confirmá tu acceso" : "Este link no es válido"}
        </h1>
        <p className="mb-7 text-base leading-[1.55] text-white/80">
          {authParams
            ? "Tocá el botón para abrir la app. Esta pantalla protege tu acceso para que los filtros de email no usen el link antes que vos."
            : error === "expired"
              ? "El acceso ya fue usado o venció. Volvé a la app y pedí un nuevo email."
              : "Volvé a la app y pedí un nuevo acceso por email."}
        </p>

        {authParams ? (
          <form
            method="post"
            action="/auth-confirm/continue"
            className="w-full"
          >
            <input type="hidden" name="token" value={authParams.token} />
            <input type="hidden" name="type" value={authParams.type} />
            <input
              type="hidden"
              name="redirect_to"
              value={authParams.redirectTo}
            />
            <button
              type="submit"
              className="h-[52px] w-full rounded-full bg-[#eefa7a] text-base font-black text-[#203326]"
            >
              Abrir Pasito
            </button>
          </form>
        ) : null}

        <p className="mt-5 text-xs leading-6 text-white/55">
          Si no pediste este acceso, cerrá esta ventana.
        </p>
      </section>
    </main>
  );
}

function stringParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
