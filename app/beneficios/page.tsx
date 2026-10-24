import type { Metadata } from "next";
import PreparationPage from "./preparation";
import { hasCatalogConfig } from "@/lib/catalogo-online/supabase/config";
export const metadata: Metadata = {
  title: "Beneficios — Pasito",
  description:
    "Descubrí los beneficios de Pasito y convertí tus pasos en experiencias.",
  alternates: { canonical: "https://www.pasito.app/beneficios" },
  // Remove when the real catalog is ready to be indexed.
  robots: { index: false, follow: true },
  openGraph: {
    title: "Beneficios — Pasito",
    description:
      "Tus pasos te llevan a cosas lindas. Descubrí los beneficios de Pasito.",
    url: "https://www.pasito.app/beneficios",
    type: "website",
  },
};

import { getCatalog } from "@/lib/catalogo-online/data";
import { getViewer } from "@/lib/catalogo-online/supabase/server";
import { Catalog } from "@/components/catalogo-online/catalog";
export default async function StoresPage() {
  if (!hasCatalogConfig()) return <PreparationPage />;
  const viewer = await getViewer();
  const rewards = await getCatalog(viewer?.profile?.country_code ?? "AR");
  return (
    <Catalog
      rewards={rewards}
      balance={viewer?.profile?.pasitos_balance ?? null}
    />
  );
}
