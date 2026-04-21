import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Polla Mundial Codemodeco 2026" },
      {
        name: "description",
        content:
          "Polla privada del Mundial 2026 de Codemodeco. Predice marcadores, compite en la tabla y gana puntos.",
      },
      { name: "author", content: "Codemodeco" },
      { property: "og:title", content: "Polla Mundial Codemodeco 2026" },
      { property: "og:description", content: "World Cup Predictor Pro is a private web app for football pool predictions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Polla Mundial Codemodeco 2026" },
      { name: "description", content: "World Cup Predictor Pro is a private web app for football pool predictions." },
      { name: "twitter:description", content: "World Cup Predictor Pro is a private web app for football pool predictions." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ea6ace28-3f47-4d30-ac78-3e4c361c49d8/id-preview-cf51bff7--8aa013ed-fd97-42c5-9ab3-053708af21c0.lovable.app-1776729708590.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ea6ace28-3f47-4d30-ac78-3e4c361c49d8/id-preview-cf51bff7--8aa013ed-fd97-42c5-9ab3-053708af21c0.lovable.app-1776729708590.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "https://codemodeco.com.co/wp-content/uploads/2025/10/cropped-Diseno-sin-titulo-10-32x32.png",
      },
      {
        rel: "shortcut icon",
        type: "image/png",
        href: "https://codemodeco.com.co/wp-content/uploads/2025/10/cropped-Diseno-sin-titulo-10-32x32.png",
      },
      {
        rel: "apple-touch-icon",
        href: "https://codemodeco.com.co/wp-content/uploads/2025/10/cropped-Diseno-sin-titulo-10-32x32.png",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
