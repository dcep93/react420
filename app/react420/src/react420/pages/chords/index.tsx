import { useState } from "react";

import _chords_json from "./chords.json";

const NUM_TO_PICK = 6;

export default function Chords() {
  const [num_to_pick, update_num_to_pick] = useState(NUM_TO_PICK);
  const [qualities_to_skip, update_qualities_to_skip] = useState<{
    [q: string]: boolean;
  }>({});
  const [showing, update_showing] = useState<{ [i: number]: boolean }>({});
  function pick(): string[] {
    return pick_helper(num_to_pick, qualities_to_skip, _chords_json);
  }
  const [picked, update_picked] = useState(pick());
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {picked.map((c, i) => (
          <div
            key={i}
            style={{
              margin: "10px",
              padding: "10px",
              border: "2px solid black",
              borderRadius: "10px",
            }}
            onClick={() =>
              update_showing(Object.assign({}, showing, { [i]: !showing[i] }))
            }
          >
            <div>{c.split(" ").join("")}</div>
            {/* {!showing[i] ? null : <div>{spell(c)}</div>} */}
          </div>
        ))}
      </div>
      <div
        style={{
          margin: "10px",
          padding: "10px",
        }}
      >
        <button
          style={{
            padding: "10px",
          }}
          onClick={() => {
            update_showing({});
            update_picked(pick());
          }}
        >
          new chords
        </button>
        <div style={{ display: "inline-block", margin: "20px" }}>
          num_to_pick:{" "}
          <input
            style={{ width: "50px" }}
            type={"number"}
            value={num_to_pick}
            onChange={(e) => update_num_to_pick(parseInt(e.target.value))}
          />
        </div>
        <div style={{ display: "flex" }}>
          chords:{" "}
          {["mM", "m7b5", "+M", "m7", "7", "M7", "dim", "sus7"].map((q, i) => (
            <div key={i} style={{ display: "inline-block", margin: "20px" }}>
              <div>{q}</div>
              <div>
                <input
                  type={"checkbox"}
                  checked={!qualities_to_skip[q]}
                  onChange={(e) =>
                    update_qualities_to_skip(
                      Object.assign({}, qualities_to_skip, {
                        [q]: !qualities_to_skip[q],
                      })
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function pick_helper(
  num_to_pick: number,
  qualities_to_skip: { [q: string]: boolean },
  chords_json: { [c: string]: number }
): string[] {
  return Object.entries(chords_json)
    .map(([c, n]) => ({ c, n }))
    .filter(
      ({ c }) =>
        Object.entries(qualities_to_skip)
          .map(([q, b]) => ({ q, b }))
          .filter(({ b }) => b)
          .find(({ q }) => c.endsWith(` ${q}`)) === undefined
    )
    .map(({ c, n }) => ({ c, prob: n * Math.random() }))
    .sort((a, b) => b.prob - a.prob)
    .map(({ c }) => c)
    .slice(0, num_to_pick);
}

// function spell(c: string): string {
//   const [root, quality] = c.split(" ");
//   return [
//     0,
//     quality.includes("sus") ? 5 : quality.includes("m") ? 3 : 4,
//     quality.includes("+") ? 8 : quality.includes("b5") ? 6 : 7,
//     quality === "dim" ? 9 : quality.includes("M") ? 11 : 10,
//   ]
//     .map((distance) => addDistance(root, distance))
//     .join(" ");
// }

// function addDistance(root: string, distance: number): string {
//   if (distance === 0) return root;
//   if (root.endsWith("b")) return addDistance(root.charAt(0), distance - 1);
//   if (root.endsWith("#")) return { A: "B" }[root.charAt(0)]!;
//   return root;
// }
