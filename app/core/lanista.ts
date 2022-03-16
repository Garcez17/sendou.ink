import { Mode } from "@prisma/client";
import { fetchTimeout } from "~/utils";

const LANISTA_REQUEST_TIMEOUT = 7000;

/** Request Lanista to send match details to match-details endpoint. */
export async function requestMatchDetails({
  matchId,
  startTime,
  endTime,
  playerDiscordIds,
  playedStages,
}: {
  matchId: string;
  startTime: Date;
  endTime?: Date;
  playerDiscordIds: string[];
  playedStages: { stage: string; mode: Mode }[];
}) {
  try {
    if (process.env.NODE_ENV === "development") {
      return;
    }
    if (!process.env.LANISTA_URL) {
      throw new Error("process.env.LANISTA_URL not set");
    }

    const response = await fetchTimeout(
      process.env.LANISTA_URL,
      LANISTA_REQUEST_TIMEOUT,
      {
        body: JSON.stringify({
          maplist: playedStages,
          requesterId: playerDiscordIds,
          startTime: startTime.toISOString(),
          endTime: (endTime ?? new Date()).toISOString(),
          matchId,
          token: process.env.LANISTA_URL_TOKEN,
        }),
        method: "post",
        headers: [["Content-Type", "application/json"]],
      }
    );

    if (!response.ok) {
      throw new Error(`error code: ${response.status}`);
    }
  } catch (e) {
    if (e instanceof Error) {
      console.error("Sending match to Lanista failed: ", e.message);
    }
  }
}
