import { useState } from "react";
import { FirebaseWrapper } from "../../firebase";

import draft_json from "./draft.json";

type DraftType = string[];
type PlayersType = { [name: string]: number };
type FirebaseType = { name: string; rank: number }[];
type ResultsType = {
  source: string;
  players: {
    name: string;
    fname: string;
    score: number;
    diffs: number[];
  }[];
}[];

function Draft() {
  const r = results(draft_json);
  return <SubDraft r={r} />;
}

class SubDraft extends FirebaseWrapper<FirebaseType, { r: ResultsType }> {
  getFirebasePath() {
    return "/ff/draft";
  }

  componentDidMount(): void {
    console.log(printF(getDraft.toString()));
    super.componentDidMount();
  }

  render() {
    const players = Object.fromEntries(
      (this.state?.state || [])
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map(({ name, rank }) => [name, rank])
    );
    const draft = (this.state?.state || []).map(({ name }) => name);
    console.log("players");
    console.log(players);
    console.log("draft");
    console.log(draft);
    return <SubSubDraft o={{ ...this.props, players, draft }} />;
  }
}

function SubSubDraft(props: {
  o: { r: ResultsType; players: PlayersType; draft: DraftType };
}) {
  const sources = props.o.r.map((d) => d.source);
  const [source, update] = useState(sources[0]);
  return (
    <pre>
      <div>
        <ul>
          {sources.map((s) => (
            <li
              key={s}
              onClick={() => update(s)}
              style={{
                cursor: "pointer",
                color: "blue",
                textDecoration: "underline",
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      </div>
      <h1>{source}</h1>
      <table
        style={{
          fontSize: "2em",
        }}
      >
        <tbody>
          {(props.o.r.find((d) => d.source === source)?.players || []).map(
            (v, i) => (
              <tr
                key={i}
                style={{
                  backgroundColor:
                    props.o.players[v.name] !== undefined ? "lightgray" : "",
                }}
              >
                <td>{v.fname}</td>
                {v.diffs.map((w, j) => (
                  <td key={j}>{w}</td>
                ))}
              </tr>
            )
          )}
        </tbody>
      </table>
    </pre>
  );
}

function getScore(o: { rank: number; adp: number }): number {
  return (100 * (o.rank - o.adp)) / (o.rank + 1);
}

function results(draft_json: {
  drafts: DraftType[];
  players: PlayersType;
}): ResultsType {
  const ds = draft_json.drafts.map((d) => ({
    size: d.length,
    picks: Object.fromEntries(d.map((p, i) => [p, i])),
  }));
  const raw = Object.entries(draft_json.players)
    .map(([name, rank]) => ({ name, rank }))
    .sort((a, b) => a.rank - b.rank)
    .map((o) => ({
      ...o,
      diffs: ds.map(
        (d) =>
          o.rank -
          ((d.picks[o.name] === undefined ? d.size : d.picks[o.name]) + 1)
      ),
    }))
    .map((o) => ({
      ...o,
      adp: o.rank - o.diffs.reduce((a, b) => a + b, 0) / o.diffs.length,
    }))
    .map((o) => ({
      ...o,
      score: getScore(o),
    }))
    .map((o) => ({
      fname: `(${[o.rank, o.adp.toFixed(1), o.score.toFixed(1)].join(
        "/"
      )}) ${o.name.substring(0, 20)}`,
      ...o,
    }));

  return [
    { source: "espn", players: raw.slice().sort((a, b) => a.rank - b.rank) },
    { source: "adp", players: raw.slice().sort((a, b) => a.adp - b.adp) },
    {
      source: "score",
      players: raw
        .slice()
        .sort((a, b) => a.score - b.score)
        .reverse(),
    },
  ];
}

function printF(s: string): string {
  return s
    .split("\n")
    .map((i) => i.trim())
    .join(" ");
}

function getDraft() {
  const history = document.getElementsByClassName("pick-history")[0];
  if (!history) return [];
  return Array.from(
    history.getElementsByClassName("fixedDataTableCellGroupLayout_cellGroup")
  )
    .map((row) => ({
      name_e: row.getElementsByClassName(
        "playerinfo__playername"
      )[0] as HTMLElement,
      rank_e: Array.from(row.children).reverse()[0] as HTMLElement,
    }))
    .filter(({ name_e, rank_e }) => name_e && rank_e)
    .map(({ name_e, rank_e }) => ({
      name: name_e.innerText,
      rank: parseInt(rank_e.innerText),
    }));
}

export function idk() {
  Array.from(
    document
      .getElementsByClassName("pick-history-tables")[0]
      .getElementsByClassName("fixedDataTableCellGroupLayout_cellGroup")
  )
    .map((i) => Array.from(i.children).reverse()[0] as HTMLElement)
    .map((i) => i?.innerText)
    .map((i) => parseInt(i))
    .filter(Boolean);
}

export default Draft;
