import { useState } from "react";
import { FirebaseWrapper } from "../../firebase";

import draft_json from "./draft.json";

// beer
// https://footballabsurdity.com/2022/06/27/2022-fantasy-football-salary-cap-values/
// Object.fromEntries(Array.from(document.getElementById("sheets-viewport").getElementsByTagName("td")).map(td => td.innerText).reduce((prev, current) => {if (parseInt(current)) return Object.assign({current}, prev); if (prev.current) return Object.assign({}, prev, {current: undefined, rank: parseInt(prev.current), name: current.split(",")[0]}); if (prev.name) return {players: prev.players.concat({name: prev.name, value: parseInt(current.split("$")[1])})}; return prev;}, {players: []}).players.sort((a,b) => a.value > b.value ? -1 : 1).map(o => [o.name, -o.value]))

type DraftType = string[];
type PlayersType = { [name: string]: number };
type FirebaseType = { name: string; rank: number }[];
type ResultsType = {
  source: string;
  players: {
    name: string;
    fname: string;
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
    return (
      <SubSubDraft
        o={{
          ...this.props,
          players: Object.fromEntries(
            Object.entries(players).map(([name, rank]) => [
              normalize(name),
              rank,
            ])
          ),
          draft,
        }}
      />
    );
  }
}

function SubSubDraft(props: {
  o: { r: ResultsType; players: PlayersType; draft: DraftType };
}) {
  const sources = props.o.r.map((d) => d.source);
  const [source, update] = useState(sources[0]);
  return (
    <pre style={{ display: "flex", height: "100vh" }}>
      <div style={{ margin: "50px" }}>
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
      </div>
      <div
        style={{
          margin: "50px",
          overflowY: "scroll",
        }}
      >
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
                      props.o.players[normalize(v.name)] !== undefined
                        ? "lightgray"
                        : "",
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
      </div>
    </pre>
  );
}

function normalize(s: string) {
  return s.replaceAll(/[^A-Za-z ]/g, "");
}

function getScore(rank: number, value: number): number {
  return (100 * (value - rank)) / rank;
}

function results(draft_json: {
  drafts: DraftType[];
  espn: PlayersType;
  extra: { [source: string]: PlayersType };
}): ResultsType {
  const ds = draft_json.drafts.map((d) => ({
    size: d.length,
    picks: Object.fromEntries(d.map((p, i) => [p, i])),
  }));
  const extra = Object.keys(draft_json.extra);
  const raw = Object.entries(draft_json.espn)
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
      extra: Object.fromEntries(
        extra.map((s) => [
          s,
          draft_json.extra[s][o.name] ||
            Object.entries(draft_json.extra[s]).length + 1,
        ])
      ),
    }))
    .map((o) => ({
      ...o,
      adp_score: getScore(o.rank, o.adp),
      scores: Object.fromEntries(
        extra.map((s) => [s, getScore(o.rank, o.extra[s])])
      ),
    }))
    .map((o) => ({
      fname: `(${[
        ...extra.map((s) => o.extra[s]),
        "",
        o.rank,
        o.adp.toFixed(1),
      ].join("/")}) ${o.name.substring(0, 20)}`,
      ...o,
    }));

  const basic = [
    { source: "espn", players: raw.slice().sort((a, b) => a.rank - b.rank) },
    { source: "adp", players: raw.slice().sort((a, b) => a.adp - b.adp) },
    {
      source: "adp_score",
      players: raw.slice().sort((a, b) => a.adp_score - b.adp_score),
    },
  ];

  const extraR = extra.map((source) => ({
    source,
    players: raw.slice().sort((a, b) => a.extra[source] - b.extra[source]),
  }));

  const extraS = extra.map((source) => ({
    source: `${source}_score`,
    players: raw.slice().sort((a, b) => a.scores[source] - b.scores[source]),
  }));

  return extraR.concat(extraS).concat(basic);
}

function printF(s: string): string {
  return s
    .split("\n")
    .map((i) => i.split("//")[0].trim())
    .join(" ");
}

function getDraft() {
  const history = document.getElementsByClassName("pick-history")[0];
  var s: { name: string; rank: number }[];
  if (!history) {
    // @ts-ignore
    s = window.state;
  } else {
    s = Array.from(
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
  const seen = Object.fromEntries(s.map((o) => [o.name, true]));
  const recent = Array.from(
    document.getElementsByClassName("pick__message-content")
  )
    .map(
      (e) =>
        e.getElementsByClassName("playerinfo__playername")[0] as HTMLElement
    )
    .map((e) => e.innerText)
    .filter((name) => !seen[name])
    .map((name, i) => ({ name, rank: s.length + 1 + i }));
  return s.concat(recent);
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
