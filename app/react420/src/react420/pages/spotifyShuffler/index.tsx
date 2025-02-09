import { useEffect, useState } from "react";
import { basic, divideAndConquer } from "./algos";

export default function SpotifyShuffler() {
  const [now, updateNow] = useState(0);
  const [data, updateData] = useState("");
  useEffect(() => {
    if (now) {
      initialized = true;
    }
    if (!initialized) {
      initialized = true;
      return;
    }
    if (!now) {
      updateNow(Date.now());
      return;
    }
    errored = false;
    moves = 0;
    shuffle().then(updateData);
  }, [now]);
  return (
    <div>
      <div
        onClick={() => {
          errored = false;
          updateNow(Date.now());
        }}
      >
        spotifyShuffler
      </div>
      <pre>{data}</pre>
    </div>
  );
}

export function moveSong(
  startIndex: number,
  count: number,
  endIndex: number,
  desiredOrder: number[]
): Promise<void> {
  moves++;
  desiredOrder.splice(endIndex, 0, ...desiredOrder.splice(startIndex, count));
  //   console.log("moveSong", {
  //     startIndex,
  //     count,
  //     endIndex,
  //     x: desiredOrder.slice(),
  //   });
  return Promise.resolve();
}

function shuffle(): Promise<string> {
  const num = 8;
  const desiredOrder = Array.from(new Array(num))
    .map((_, i) => ({ i, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(({ i }) => i);

  console.log({ desiredOrder });

  const fs = {
    // basic,
    divideAndConquer,
  };

  return Promise.resolve()
    .then(() =>
      Object.entries(fs)
        .map(([fn, ff]) => ({ fn, ff, dOrder: desiredOrder.slice() }))
        .map((o) =>
          o.ff(o.dOrder, 0, desiredOrder.length).then((count) =>
            Promise.resolve()
              .then(() => basic(o.dOrder, 0, desiredOrder.length))
              .then((subCount) => {
                if (subCount !== 0) {
                  throw new Error("shuffle.subCount");
                }
              })
              .then(() => ({
                ...o,
                count,
              }))
          )
        )
    )
    .then((ps) => Promise.all(ps))
    .then((os) => os.map(({ fn, count }) => [fn, count]))
    .then((os) => Object.fromEntries(os))
    .then((o) => ({
      ...o,
      moves,
      num,
      errored,
      desiredOrder: JSON.stringify(desiredOrder),
    }))
    .then((o) => JSON.stringify(o, null, 2));
}

var initialized = false;
export var errored = false;
export var moves = 0;

export function setErrored() {
  errored = true;
}
