import {
  json,
  type LinksFunction,
  type LoaderFunction,
  type MetaFunction,
} from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type ShouldReloadFunction,
} from "@remix-run/react";
import * as React from "react";
import commonStyles from "~/styles/common.css";
import variableStyles from "~/styles/vars.css";
import utilStyles from "~/styles/utils.css";
import layoutStyles from "~/styles/layout.css";
import resetStyles from "~/styles/reset.css";
import { Catcher } from "./components/Catcher";
import { Layout } from "./components/layout";
import { db } from "./db";
import type { FindAllPatrons } from "./db/models/users/queries.server";
import type { UserWithPlusTier } from "./db/types";
import { getUser } from "./modules/auth";
import { DEFAULT_LANGUAGE, i18next } from "./modules/i18n";
import { useChangeLanguage } from "remix-i18next";
import { useTranslation } from "react-i18next";
import { Theme, ThemeHead, useTheme, ThemeProvider } from "./modules/theme";
import { getThemeSession } from "./modules/theme/session.server";

export const unstable_shouldReload: ShouldReloadFunction = () => false;

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: resetStyles },
    { rel: "stylesheet", href: commonStyles },
    { rel: "stylesheet", href: variableStyles },
    { rel: "stylesheet", href: utilStyles },
    { rel: "stylesheet", href: layoutStyles },
  ];
};

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "sendou.ink",
  viewport: "width=device-width,initial-scale=1",
  "theme-color": "#8263de",
});

export interface RootLoaderData {
  locale: string;
  theme: Theme | null;
  patrons: FindAllPatrons;
  user?: Pick<
    UserWithPlusTier,
    "id" | "discordId" | "discordAvatar" | "plusTier"
  >;
}

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  const locale = await i18next.getLocale(request);
  const themeSession = await getThemeSession(request);

  return json<RootLoaderData>({
    locale,
    theme: themeSession.getTheme(),
    patrons: db.users.findAllPatrons(),
    user: user
      ? {
          discordAvatar: user.discordAvatar,
          discordId: user.discordId,
          id: user.id,
          plusTier: user.plusTier,
        }
      : undefined,
  });
};

export const handle = {
  i18n: "common",
};

function Document({
  children,
  data,
}: {
  children: React.ReactNode;
  data?: RootLoaderData;
}) {
  const [theme] = useTheme();
  const { i18n } = useTranslation();
  const locale = data?.locale ?? DEFAULT_LANGUAGE;
  useChangeLanguage(locale);

  return (
    <html lang={locale} dir={i18n.dir()} className={theme ?? ""}>
      <head>
        <Meta />
        <Links />
        <ThemeHead ssrTheme={Boolean(data?.theme)} />
      </head>
      <body>
        <React.StrictMode>
          <Layout patrons={data?.patrons} isCatchBoundary={!data}>
            {children}
          </Layout>
        </React.StrictMode>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export default function App() {
  // prop drilling data instead of using useLoaderData in the child components directly because
  // useLoaderData can't be used in CatchBoundary and layout is rendered in it as well
  const data = useLoaderData<RootLoaderData>();

  return (
    <ThemeProvider specifiedTheme={data?.theme ?? null}>
      <Document data={data}>
        <Outlet />
      </Document>
    </ThemeProvider>
  );
}

export function CatchBoundary() {
  return (
    <ThemeProvider specifiedTheme={Theme.DARK}>
      <Document>
        <Catcher />
      </Document>
    </ThemeProvider>
  );
}
