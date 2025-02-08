import { useEffect, useState } from "react";

var initialized = false;
var errored = false;

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

function moveSong(
  startIndex: number,
  count: number,
  endIndex: number,
  desiredOrder: number[]
): Promise<void> {
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
  const num = 1024;
  const desiredOrder = Array.from(new Array(num))
    .map((_, i) => ({ i, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(({ i }) => i);

  const fs = {
    basic,
    divideAndConquer,
  };

  return Promise.resolve()
    .then(() =>
      Object.entries(fs).map(([fn, ff]) =>
        ff(desiredOrder.slice(), 0, desiredOrder.length).then((count) => ({
          fn,
          count,
        }))
      )
    )
    .then((ps) => Promise.all(ps))
    .then((os) => os.map(({ fn, count }) => [fn, count]))
    .then((os) => Object.fromEntries(os))
    .then((o) => ({
      ...o,
      num,
      errored,
      desiredOrder: JSON.stringify(desiredOrder),
    }))
    .then((o) => JSON.stringify(o, null, 2));
}

function find(
  desiredOrder: number[],
  startIndex: number,
  endIndex: number
): { currentIndex: number; sortedIndex: number } | undefined {
  // todo allow approximation:
  // sort=[...below_window_unordered,within_window_ordered,...above_window_unordered]
  return desiredOrder
    .map((value, currentIndex) => ({ value, currentIndex }))
    .filter(
      ({ currentIndex }) =>
        currentIndex >= startIndex && currentIndex < endIndex
    )
    .sort((a, b) => a.value - b.value)
    .map((o, sortedIndex) => ({ ...o, sortedIndex: sortedIndex + startIndex }))
    .find((o) => o.sortedIndex !== o.currentIndex);
}

async function basic(
  desiredOrder: number[],
  startIndex: number,
  endIndex: number
): Promise<number> {
  //   console.log("basic", { startIndex, endIndex });
  var count = 0;
  while (count <= endIndex - startIndex) {
    const found = find(desiredOrder, startIndex, endIndex);
    if (found === undefined) {
      return Promise.resolve(count);
    }
    count++;
    await moveSong(found.currentIndex, 1, found.sortedIndex, desiredOrder);
  }
  if (!errored) {
    errored = true;
    console.log("error basic", { startIndex, endIndex, desiredOrder });
  }
  return Promise.resolve(-1);
}

function divideAndConquer(
  desiredOrder: number[],
  startIndex: number,
  endIndex: number,
  isSubCall: boolean = false
): Promise<number> {
  //   console.log("divideAndConquer");
  const min = 2;
  const size = endIndex - startIndex;
  if (size <= min) {
    return basic(desiredOrder, startIndex, endIndex);
  }
  const midpoint = Math.floor((startIndex + endIndex) / 2);
  return Promise.resolve()
    .then(() => [
      divideAndConquer(desiredOrder, startIndex, midpoint),
      divideAndConquer(desiredOrder, midpoint, endIndex),
    ])
    .then((ps) => Promise.all(ps))
    .then((counts) => Math.max(...counts))
    .then(async (count) => {
      const pivot = desiredOrder
        .map((value, currentIndex) => ({ value, currentIndex }))
        .filter(
          ({ currentIndex }) =>
            currentIndex >= midpoint && currentIndex < endIndex
        )
        .reverse()
        .find(
          ({ value, currentIndex }) =>
            value < desiredOrder[2 * midpoint - currentIndex - 1]
        );
      if (pivot === undefined) {
        return count;
      }
      if (isSubCall) {
        console.log(pivot);
        throw new Error("isSubCall");
      }
      await moveSong(
        midpoint,
        pivot.currentIndex - midpoint + 1,
        startIndex,
        desiredOrder
      );
      const subcounts = await divideAndConquer(
        desiredOrder,
        startIndex,
        endIndex,
        true
      );
      return subcounts + count + 1;
    });
}
