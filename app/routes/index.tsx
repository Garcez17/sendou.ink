import { json, type LinksFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "~/components/icons/ArrowRight";
import { Image } from "~/components/Image";
import { Main } from "~/components/Main";
import { db } from "~/db";
import { useIsMounted } from "~/hooks/useIsMounted";
import { mostRecentArticles } from "~/modules/articles";
import styles from "~/styles/front.css";
import { databaseTimestampToDate } from "~/utils/dates";
import { discordFullName } from "~/utils/strings";
import {
  articlePage,
  BADGES_PAGE,
  calendarEventPage,
  CALENDAR_PAGE,
  navIconUrl,
  plusSuggestionPage,
  userPage,
} from "~/utils/urls";
import { Tags } from "./calendar/components/Tags";

const RECENT_ARTICLES_TO_SHOW = 3;

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: styles }];
};

export const loader = async () => {
  return json({
    upcomingEvents: db.calendarEvents.upcomingEvents(),
    recentWinners: db.calendarEvents.recentWinners(),
    recentArticles: await mostRecentArticles(RECENT_ARTICLES_TO_SHOW),
  });
};

export default function Index() {
  const { t } = useTranslation(["common", "front"]);

  return (
    <Main className="stack lg">
      <Header />
      <div className="stack md">
        <CalendarPeek />
        <GoToPageBanner to={CALENDAR_PAGE} navItem="calendar">
          {t("front:calendarGoTo")}
        </GoToPageBanner>
      </div>
      <ArticlesPeek />
      <div className="stack md">
        <h2 className="front__more-features">{t("front:moreFeatures")}</h2>
        <div className="front__feature-cards">
          <FeatureCard
            navItem="plus"
            title={t("common:pages.plus")}
            description={t("front:plus.description")}
            to={plusSuggestionPage()}
          />
          <FeatureCard
            navItem="badges"
            title={t("common:pages.badges")}
            description={t("front:badges.description")}
            to={BADGES_PAGE}
          />
        </div>
      </div>
    </Main>
  );
}

function Header() {
  const { t } = useTranslation("front");

  return (
    <div className="front__logo-container">
      <h1>sendou.ink</h1>
      <h2>{t("websiteSubtitle")}</h2>
    </div>
  );
}

function GoToPageBanner({
  children,
  to,
  navItem,
}: {
  children: React.ReactNode;
  to: string;
  navItem: string;
}) {
  return (
    <Link to={to} className="front__go-to-page-banner">
      <div className="front__go-to-page-banner__nav-img-container">
        <Image
          path={navIconUrl(navItem)}
          alt={navItem}
          width={32}
          height={32}
        />
      </div>
      {children}
      <ArrowRightIcon className="front__go-to-page-banner__arrow-right" />
    </Link>
  );
}

function CalendarPeek() {
  const data = useLoaderData<typeof loader>();
  const { t, i18n } = useTranslation("front");

  return (
    <div className="front__calendar-peek-container">
      <div className="stack sm">
        <h2 className="front__calendar-header">{t("recentWinners")}</h2>
        {data.recentWinners.map((result) => (
          <Event
            key={result.eventId}
            eventId={result.eventId}
            eventName={result.eventName}
            startTimeString={databaseTimestampToDate(
              result.startTime
            ).toLocaleDateString(i18n.language, {
              day: "numeric",
              month: "long",
            })}
          >
            <ul className="front__event-winners">
              {result.players.map((player) => (
                <li
                  key={typeof player === "string" ? player : player.id}
                  className="flex items-center"
                >
                  {typeof player === "string" ? (
                    player
                  ) : (
                    <Link
                      to={userPage(player.discordId)}
                      className="stack horizontal xs items-center"
                    >
                      {discordFullName(player)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Event>
        ))}
      </div>
      <div className="stack sm">
        <h2 className="front__calendar-header">{t("upcomingEvents")}</h2>
        {data.upcomingEvents.map((event) => (
          <Event
            key={event.eventId}
            eventId={event.eventId}
            eventName={event.eventName}
            startTimeString={databaseTimestampToDate(
              event.startTime
            ).toLocaleString(i18n.language, {
              day: "numeric",
              month: "numeric",
              hour: "numeric",
              minute: "numeric",
            })}
          >
            <Tags tags={event.tags} badges={event.badgePrizes} />
          </Event>
        ))}
      </div>
    </div>
  );
}

function Event({
  eventId,
  eventName,
  startTimeString,
  children,
}: {
  eventId: number;
  eventName: string;
  startTimeString: string;
  children: React.ReactNode;
}) {
  const isMounted = useIsMounted();

  return (
    <div className="front__event">
      <Link to={calendarEventPage(eventId)} className="front__event-name">
        {eventName}
      </Link>
      {isMounted && <div className="front__event-time">{startTimeString}</div>}
      <div className="front__event-content-below">{children}</div>
    </div>
  );
}

function ArticlesPeek() {
  const { t } = useTranslation("front");
  const data = useLoaderData<typeof loader>();

  return (
    <ul className="front__articles">
      {data.recentArticles.map((article) => (
        <li key={article.title}>
          <Link to={articlePage(article.slug)}>{article.title}</Link>
          <div className="text-xs text-lighter">
            {t("articleBy", { author: article.author })} •{" "}
            <time>{article.dateString}</time>
          </div>
        </li>
      ))}
    </ul>
  );
}

function FeatureCard({
  navItem,
  title,
  description,
  to,
}: {
  navItem: string;
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link to={to} className="front__feature-card">
      <Image
        path={navIconUrl(navItem)}
        alt={navItem}
        width={48}
        height={48}
        className="front__feature-card__nav-icon"
      />
      <h3 className="front__feature-card__title">{title}</h3>
      <div className="front__feature-card__description">{description}</div>
    </Link>
  );
}
