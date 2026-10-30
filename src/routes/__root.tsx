import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist on REVV- Web.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error("Root error boundary caught error:", error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const jsonLdWebsite = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://revv.asteralabs.digital/#website",
      "url": "https://revv.asteralabs.digital",
      "name": "REVV- Web",
      "description":
        "Friendly Neighborhood Riding Companion: turn-by-turn navigation, rider feed, communities, group voice intercom, and digital garage.",
      "publisher": {
        "@type": "Organization",
        "name": "REVV",
        "url": "https://revv.asteralabs.digital",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://revv.asteralabs.digital/#app",
      "name": "REVV- Web",
      "operatingSystem": "Web, iOS, Android",
      "applicationCategory": "NavigationApplication, SocialNetworkingApplication",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "description":
        "REVV connects motorcycle riders with turn-by-turn HUD navigation, real-time group intercom, rider feeds, club coordination, and digital garage telemetry.",
    },
  ],
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5" },
      { title: "REVV- Web — Friendly Neighborhood Riding Companion" },
      {
        name: "description",
        content:
          "REVV- Web is the official web portal for REVV – Riding Companion: motorcycle news, maintenance dispatches, turn-by-turn HUD, digital garage, and community feeds.",
      },
      { name: "application-name", content: "REVV- Web" },
      { name: "apple-mobile-web-app-title", content: "REVV- Web" },
      { name: "theme-color", content: "#0A0D10" },
      { name: "author", content: "REVV Team" },
      { name: "publisher", content: "Astera Labs Digital" },
      {
        name: "keywords",
        content:
          "REVV- Web, REVV, riding companion, motorcycle news, bike maintenance, motorcycle routes, rider feed, digital garage, asteralabs digital",
      },
      { property: "og:site_name", content: "REVV- Web" },
      { property: "og:title", content: "REVV- Web — Friendly Neighborhood Riding Companion" },
      {
        property: "og:description",
        content:
          "Start rides, share routes, and stay connected with your crews. Every road has a story.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://revv.asteralabs.digital" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "REVV- Web — Friendly Neighborhood Riding Companion" },
      {
        name: "twitter:description",
        content:
          "Motorcycle riding companion and news hub: turn-by-turn HUD, crew feeds, and digital garage.",
      },
      {
        name: "robots",
        content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
      },
    ],
    links: [
      { rel: "canonical", href: "https://revv.asteralabs.digital" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "alternate", type: "text/plain", href: "/llms.txt", title: "LLM Context" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(jsonLdWebsite),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
