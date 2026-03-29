"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ApiDocsPage() {
  const [SwaggerUI, setSwaggerUI] =
    useState<React.ComponentType<{ url: string; docExpansion: string; tryItOutEnabled: boolean }> | null>(null);

  useEffect(() => {
    // Dynamic import avoids SSR issues with swagger-ui-react
    import("swagger-ui-react").then((m) => setSwaggerUI(() => m.default));

    // Load Swagger UI CSS from CDN
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.2/swagger-ui.css";
    document.head.appendChild(link);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-950 px-6 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/20 border border-brand-500/30">
          <span className="text-sm text-brand-400">⬡</span>
        </div>
        <span className="text-sm font-bold text-gray-100">Primetrade API Docs</span>
        <span className="ml-auto rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400">v1.0.0</span>
        <Link
          href="/dashboard"
          className="rounded-lg border border-gray-700 px-3 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Swagger UI */}
      {SwaggerUI ? (
        <SwaggerUI
          url="/api/v1/docs"
          docExpansion="list"
          tryItOutEnabled={true}
        />
      ) : (
        <div className="flex h-96 items-center justify-center text-gray-400 text-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
            Loading API documentation…
          </div>
        </div>
      )}
    </div>
  );
}
