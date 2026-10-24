"use client";
import { useState } from "react";

export function StoreAvatar({
  name,
  logoUrl,
  large = false,
}: {
  name: string;
  logoUrl: string | null;
  large?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const hasImage = Boolean(logoUrl && failedUrl !== logoUrl);
  return (
    <span className={`store-avatar${large ? " large" : ""}`} aria-hidden="true">
      {hasImage ? (
        <img
          src={logoUrl!}
          alt=""
          loading={large ? "eager" : "lazy"}
          onError={() => setFailedUrl(logoUrl)}
        />
      ) : (
        <span>{name.trim().slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}
