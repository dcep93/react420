import picks_raw from "./group.json";
import propositions_raw from "./propositions.json";

const picks: {
  entries: {
    name: string;
    picks: {
      outcomesPicked: {
        outcomeId: string;
        result: string;
      }[];
      propositionId: string;
    }[];
  }[];
} = picks_raw;
const propositions: {
  id: string;
  date: number;
  possibleOutcomes: { id: string; description: string }[];
}[] = propositions_raw;

export default function MarchMadness() {
  return (
    <div>
      <div>
        {[
          "https://fantasy.espn.com/games/tournament-challenge-bracket-2025/group?id=46bd58e9-75da-4c0c-8c95-e1712bab4d53",
          "https://gambit-api.fantasy.espn.com/apis/v1/propositions/?challengeId=257&platform=chui&view=chui_default",
        ].map((url, i) => (
          <div key={i}>
            <a href={url}>{url}</a>
          </div>
        ))}
      </div>
      <pre>
        {Object.values(
          groupByF(
            picks.entries.flatMap((e) =>
              e.picks.map((p) => ({
                p: {
                  propositionId: p.propositionId,
                  outcomePicked: p.outcomesPicked[0],
                },
                name: e.name,
              }))
            ),
            (p) => p.p.propositionId
          )
        )
          .map((entries) =>
            groupByF(entries, (e) =>
              JSON.stringify(e.p.outcomePicked.outcomeId)
            )
          )
          .filter((picked) => Object.keys(picked).length !== 1)
          .flatMap((picked) => Object.values(picked))
          .map((outliers) =>
            ((p) => ({
              names: outliers.map((o) => o.name),
              p,
              prop: propositions.find((pr) => pr.id === p.propositionId)!,
            }))(outliers[0].p)
          )
          .sort((a, b) => a.prop.date - b.prop.date)
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
                <div>{new Date(o.prop?.date || 0).toLocaleString()}</div>
                <div>{o.p.outcomePicked.result}</div>
                <div>
                  {o.prop.possibleOutcomes
                    .map((p) => ({
                      p,
                      s: { [o.p.outcomePicked.outcomeId]: -1 }[p.id] || 0,
                    }))
                    .sort((a, b) => a.s - b.s)
                    .map((o) => o.p.description)
                    .join(" > ")}
                </div>
                <div>{o.prop.id}</div>
                <div>-</div>
                <div>
                  {o.names.map((n, j) => (
                    <div key={j}>{n}</div>
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
