import { useState } from "react";

import _chords_json from "./chords.json";

const NUM_TO_PICK = 6;

export default function Chords() {
  const [num_to_pick, update_num_to_pick] = useState(NUM_TO_PICK);
  const [qualities_to_skip, update_qualities_to_skip] = useState<{
    [q: string]: boolean;
  }>({});
  function pick(): string[] {
    return pick_helper(num_to_pick, qualities_to_skip, _chords_json);
  }
  const [picked, update_picked] = useState(pick());
  return (
    <div>
      <div style={{ display: "flex" }}>
        {picked.map((c, i) => (
          <div
            key={i}
            style={{
              margin: "10px",
              padding: "10px",
              border: "2px solid black",
              borderRadius: "10px",
            }}
          >
            {c}
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
          onClick={() => update_picked(pick())}
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
        <div>
          chords:{" "}
          {["mM7", "m7b5", "+M7", "m7", "7", "M7", "dim"].map((q, i) => (
            <div key={i} style={{ display: "inline-block", margin: "20px" }}>
              <div>{q}</div>
              <div>
                <input
                  type={"checkbox"}
                  checked={!qualities_to_skip[q]}
                  onChange={(e) =>
                    update_qualities_to_skip(
                      Object.assign({}, qualities_to_skip, {
                        [q]: !e.target.checked,
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
    .map(({ c }) => c.split(" ").join(""))
    .slice(0, num_to_pick);
}
