import { useEffect, useState } from "react";
import picks_raw from "./group.json";
import propositions_raw from "./propositions.json";

const picks: {
  entries: {
    name: string;
    picks: {
      outcomesPicked: {
        outcomeId: string;
      }[];
      propositionId: string;
    }[];
  }[];
} = picks_raw;

export default function MarchMadness() {
  const [propositions, update] = useState<
    {
      id: string;
      date: number;
      correctOutcomes?: string[];
      possibleOutcomes: {
        id: string;
        description: string;
        mappings: { type: string; value: string }[];
      }[];
    }[]
  >(propositions_raw);
  useEffect(() => {
    fetch(
      "https://gambit-api.fantasy.espn.com/apis/v1/propositions/?challengeId=257&platform=chui&view=chui_default"
    )
      .then((r) => r.json())
      .then(update);
  }, []);
  const competitorPicks = Object.fromEntries(
    picks.entries.map((e, entryIndex) => [
      entryIndex,
      groupByF(
        e.picks
          .map((p) => ({
            p,
            prop: propositions.find((prop) => prop.id === p.propositionId)!,
          }))
          .map((o) => ({
            competitorId: o.prop.possibleOutcomes
              .find(
                (outcome) => outcome.id === o.p.outcomesPicked[0].outcomeId
              )!
              .mappings.find((m) => m.type === "COMPETITOR_ID")!.value,
            date: o.prop.date,
          })),
        (o) => o.competitorId
      ),
    ])
  );
  return (
    <div>
      <div>
        {[
          "https://fantasy.espn.com/games/tournament-challenge-bracket-2025/group?id=46bd58e9-75da-4c0c-8c95-e1712bab4d53",
          "https://gambit-api.fantasy.espn.com/apis/v1/challenges/257/groups/46bd58e9-75da-4c0c-8c95-e1712bab4d53/?view=chui_bracketcast_group&platform=chui",
          "https://gambit-api.fantasy.espn.com/apis/v1/propositions/?challengeId=257&platform=chui&view=chui_default",
        ].map((url, i) => (
          <div key={i}>
            <a href={url}>{url}</a>
          </div>
        ))}
      </div>
      <pre>
        {propositions
          .sort((a, b) => a.date - b.date)
          .map((prop) => ({
            prop,
            grouped: groupByF(
              picks.entries.map((e, entryIndex) => ({
                entryIndex,
                name: e.name,
                outcomeId: e.picks.find((p) => p.propositionId === prop.id)!
                  .outcomesPicked[0].outcomeId,
              })),
              (p) => p.outcomeId
            ),
          }))
          .filter(({ grouped }) => Object.keys(grouped).length !== 1)
          .map((o, i) => (
            <div key={i}>
              <div
                style={{
                  display: "inline-block",
                  borderRadius: "1em",
                  border: "2px solid black",
                  padding: "0.7em",
                  margin: "0.5em",
                }}
              >
                <div>
                  #{i + 1} {new Date(o.prop.date).toLocaleString()}
                </div>
                <div>-</div>
                <div
                  style={{
                    display: "flex",
                    gap: "4em",
                  }}
                >
                  {o.prop.possibleOutcomes
                    .map((p) => ({ p, picked: o.grouped[p.id] }))
                    .map((p) => ({
                      p,
                      s: p.picked?.length || Number.POSITIVE_INFINITY,
                    }))
                    .sort((a, b) => a.s - b.s)
                    .map((p, j) => (
                      <div key={j}>
                        <div
                          style={{
                            backgroundColor: o.prop.correctOutcomes?.includes(
                              p.p.p.id
                            )
                              ? "lightgreen"
                              : undefined,
                          }}
                        >
                          {p.p.p.description}
                        </div>
                        <div>
                          {p.p.picked
                            ?.map(
                              (picker) =>
                                `${picker.name} (${competitorPicks[
                                  picker.entryIndex
                                ][
                                  p.p.p.mappings.find(
                                    (m) => m.type === "COMPETITOR_ID"
                                  )!.value
                                ]
                                  .filter(({ date }) => date > o.prop.date)
                                  .map(() => "x")
                                  .join("")})`
                            )
                            .join(" / ")}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
      </pre>
    </div>
  );
}

export function groupByF<T>(
  ts: T[],
  f: (t: T) => string
): { [key: string]: T[] } {
  return ts.reduce((prev, curr) => {
    const key = f(curr);
    if (!prev[key]) prev[key] = [];
    prev[key]!.push(curr);
    return prev;
  }, {} as { [key: string]: T[] });
}
