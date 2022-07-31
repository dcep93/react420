import { useState } from "react";
import { FirebaseWrapper } from "../../firebase";

import draft_json from "./draft.json";

type DraftType = string[];
type PlayersType = { [name: string]: number };
type FirebaseType = { name: string; rank: number }[];
type PType = { position: string; team: string };
type RPType = {
  name: string;
  fname: string;
  diffs: number[];
  value: number;
} & PType;
type ResultsType = {
  source: string;
  players: RPType[];
}[];
type DraftJsonType = {
  drafts: DraftType[];
  players: { [name: string]: PType };
  espn: PlayersType;
  extra: { [source: string]: PlayersType };
};

function Draft() {
  const r = results(draft_json);
  return <SubDraft r={r} />;
}

class SubDraft extends FirebaseWrapper<FirebaseType, { r: ResultsType }> {
  getFirebasePath() {
    return "/ff/draft";
  }

  componentDidMount(): void {
    super.componentDidMount();
  }

  render() {
    console.log(this.state?.state);
    return (
      <SubSubDraft
        o={{
          ...this.props,
          f: this.state?.state || [],
        }}
      />
    );
  }
}

function SubSubDraft(props: { o: { r: ResultsType; f: FirebaseType } }) {
  const espn = Object.fromEntries(
    props.o.f
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map(({ name, rank }) => [normalize(name), rank])
  );
  const drafted = props.o.f.map(({ name }) => name);
  const sources = props.o.r.map((d) => d.source);
  const [source, update] = useState(sources[0]);
  const players = (
    props.o.r.find((d) => d.source === source)?.players || []
  ).map((p) => ({
    ...p,
    seen: espn[p.name] !== undefined,
  }));
  return (
    <pre style={{ display: "flex", height: "90vh" }}>
      <div style={{ margin: "20px" }}>
        <div>
          <ul>
            {sources.map((s) => (
              <li
                key={s}
                onClick={() => update(s)}
                style={{
                  fontSize: "2em",
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
        <h1>
          {source} ({drafted.length})
        </h1>
        <div>
          <div>drafted</div>
          <input readOnly value={JSON.stringify(drafted)} />
        </div>
        <div>
          <div>espn</div>
          <input readOnly value={JSON.stringify(espn)} />
        </div>
      </div>
      <div
        style={{
          margin: "20px",
          overflowY: "scroll",
        }}
      >
        <table>
          <tbody>
            {players
              .map((player, i) => ({
                ...player,
                i,
                pos_rank: players
                  .slice(0, i)
                  .filter((p, j) => p.position === player.position).length,
              }))
              .map((v, i) => (
                <tr
                  key={i}
                  style={{
                    backgroundColor: v.seen ? "lightgray" : "",
                  }}
                >
                  <td>
                    {v.value % 1 === 0 ? v.value : v.value.toFixed(1)} (
                    {v.pos_rank + 1}/{v.i + 1})
                  </td>
                  <td
                    style={{
                      backgroundColor: {
                        "RUNNING BACKS": "lightblue",
                        "WIDE RECEIVERS": "lightseagreen",
                        "TIGHT ENDS": "lightcoral",
                        QUARTERBACKS: "purple",
                        DEFENSES: "lightsalmon",
                      }[v.position],
                      fontSize: "2em",
                    }}
                  >
                    {v.fname}, {v.team}
                  </td>
                  {v.diffs.map((w, j) => (
                    <td key={j}>{w}</td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </pre>
  );
}

function normalize(s: string) {
  return s
    .replaceAll(/[^A-Za-z ]/g, "")
    .replaceAll(/ I+$/g, "")
    .replaceAll(/ jr$/gi, "");
}

function getScore(rank: number, value: number): number {
  return (100 * (value - rank)) / rank;
}

function results(draft_json: DraftJsonType): ResultsType {
  draft_json.extra = Object.fromEntries(
    Object.entries(draft_json.extra).map(([s, ps]) => [
      s,
      Object.fromEntries(
        Object.entries(ps).map(([name, value]) => [normalize(name), value])
      ),
    ])
  );
  draft_json.players = Object.fromEntries(
    Object.entries(draft_json.players).map(([name, o]) => [normalize(name), o])
  );
  const ds = draft_json.drafts.map((d) => ({
    size: d.length,
    picks: Object.fromEntries(d.map((p, i) => [p, i])),
  }));
  const extra = Object.keys(draft_json.extra);
  const raw = Object.entries(draft_json.espn)
    .map(([name, espn]) => ({ name, espn }))
    .sort((a, b) => a.espn - b.espn)
    .map((o) => ({
      ...o,
      diffs: ds.map(
        (d) =>
          o.espn -
          ((d.picks[o.name] === undefined ? d.size : d.picks[o.name]) + 1)
      ),
      extra: Object.fromEntries(
        extra.map((s) => [
          s,
          draft_json.extra[s][normalize(o.name)] ||
            Object.entries(draft_json.extra[s]).length + 1,
        ])
      ),
    }))
    .map((o) => ({
      ...o,
      adp: o.espn - o.diffs.reduce((a, b) => a + b, 0) / o.diffs.length,
    }))
    .map((o) => ({
      ...o,
      espn_score: getScore(o.adp, o.espn),
      scores: Object.fromEntries(
        extra.map((s) => [s, getScore(o.adp, o.extra[s])])
      ),
    }))
    .map((o) => ({
      fname: `(${[
        ...extra.map((s) => (o.extra[s] < 0 ? `$${-o.extra[s]}` : o.extra[s])),
        "",
        o.espn,
        o.adp.toFixed(1),
      ].join("/")}) ${o.name.substring(0, 20)}`,
      ...o,
    }))
    .map(({ name, ...o }) => ({
      name: normalize(name),
      ...o,
      ...(name.includes("D/ST") ? { position: "DEFENSES" } : {}),
    }))
    .map((o) => ({ ...o, ...draft_json.players[o.name] }));

  const basic = [
    { source: "espn", players: raw.map((p) => ({ ...p, value: p.espn })) },
    { source: "adp", players: raw.map((p) => ({ ...p, value: p.adp })) },
    {
      source: "espn_score",
      players: raw.map((p) => ({ ...p, value: p.espn_score })),
    },
  ];

  const extraR = extra.map((source) => ({
    source,
    players: raw.map((p) => ({ ...p, value: p.extra[source] })),
  }));

  const extraS = extra.map((source) => ({
    source: `${source}_score`,
    players: raw.map((p) => ({ ...p, value: p.scores[source] })),
  }));

  return extraR
    .concat(basic)
    .concat(extraS)
    .map(({ players, ...o }) => ({
      ...o,
      players: players.sort((a, b) => a.value - b.value),
    }));
}

export function printF(s: string): string {
  return s
    .split("\n")
    .map((i) => i.split("//")[0].trim())
    .join(" ");
}

export function getDraft() {
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

export function getPlayersFromBeersheets() {
  return Object.fromEntries(
    Array.from(
      document.getElementById("sheets-viewport")!.getElementsByTagName("tr")
    )
      .flatMap((tr, i) =>
        Array.from(tr.children)
          .map((td) => td as HTMLElement)
          .map((td, j) => ({ td: td.innerText, i, j: j - 1 }))
      )
      .filter(({ td, j }) => [1, 5, 9].includes(j) && td && td !== "Player")
      .map((o) => ({ ...o, index: 100 * o.j + o.i, split: o.td.split(", ") }))
      .sort((a, b) => a.index - b.index)
      .reduce(
        (prev, { td, split }) => {
          if (!td.includes(",")) return { ...prev, position: td };
          return {
            ...prev,
            players: (prev.players || []).concat({
              name: split[0],
              team: split[1],
              position: prev.position!,
            }),
          };
        },
        {} as {
          players?: {
            name: string;
            team: string;
            position: string;
          }[];
          position?: string;
        }
      )
      .players!.map((o) => [o.name, { position: o.position, team: o.team }])
  );
}

export function getFromBeersheets(): PlayersType {
  // https://footballabsurdity.com/2022/06/27/2022-fantasy-football-salary-cap-values/
  return Object.fromEntries(
    Array.from(
      document.getElementById("sheets-viewport")!.getElementsByTagName("tr")
    )
      .flatMap((tr, i) =>
        Array.from(tr.children)
          .map((td) => td as HTMLElement)
          .map((td, j) => ({ td: td.innerText, i, j }))
      )
      .map(({ td }) => td)
      .reduce(
        (prev, current) => {
          if (parseInt(current)) return Object.assign({ current }, prev);
          if (prev.current)
            return Object.assign({}, prev, {
              rank: parseInt(prev.current),
              name: current.split(",")[0],
            });
          if (prev.name)
            return {
              players: (prev.players || []).concat({
                name: prev.name,
                salary: parseInt(current.split("$")[1]),
              }),
            };
          return prev;
        },
        {} as {
          players?: {
            name: string;
            salary: number;
          }[];
          current?: string;
          name?: string;
        }
      )
      .players!.sort((a, b) => (a.salary > b.salary ? -1 : 1))
      .map((o) => [o.name, -o.salary])
  );
}

export function getEspnLiveDraft(max_index: number) {
  // https://fantasy.espn.com/football/livedraftresults?leagueId=203836968
  const players = {
    adp: [] as [string, number][],
    avc: [] as [string, number][],
  };
  function helper(index: number) {
    if (index > max_index) {
      console.log({
        average_draft: Object.fromEntries(
          players.adp.sort((a, b) => a[1] - b[1])
        ),
        average_auction: Object.fromEntries(
          players.avc.sort((a, b) => a[1] - b[1])
        ),
      });
      return;
    }
    function subHelper() {
      Array.from(document.getElementsByTagName("tr"))
        .map((tr) => tr)
        .map((tr) => ({
          nameE: tr.getElementsByClassName(
            "player-column__athlete"
          )[0] as HTMLElement,
          adpE: tr.getElementsByClassName("adp")[0] as HTMLElement,
          avcE: tr.getElementsByClassName("avc")[0] as HTMLElement,
        }))
        .filter(({ nameE, adpE, avcE }) => nameE && adpE && avcE)
        .map(({ nameE, adpE, avcE }) => ({
          name: (nameE.children[0] as HTMLElement).innerText,
          adp: parseFloat(adpE.innerText),
          avc: -parseFloat(avcE.innerText),
        }))
        .forEach(({ name, adp, avc }) => {
          players.adp.push([name, adp]);
          players.avc.push([name, avc]);
        });
      helper(index + 1);
    }
    const clickable = Array.from(
      document.getElementsByClassName("Pagination__list__item__link")
    )
      .map((i) => i as HTMLElement)
      .find((i) => i.innerText === index.toString())!;
    if (clickable) {
      clickable.click();
      setTimeout(subHelper, 3000);
    } else {
      subHelper();
    }
  }
  helper(1);
}

console.log(printF(getEspnLiveDraft.toString()));

export default Draft;
