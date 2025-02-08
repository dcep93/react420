import { useEffect, useState } from "react";

var errored = true;

export default function SpotifyShuffler() {
  const [now, updateNow] = useState(0);
  const [data, updateData] = useState("");
  useEffect(() => {
    if (errored) {
      errored = false;
      return;
    }
    shuffle(now).then(updateData);
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
  console.log("moveSong", { startIndex, count, endIndex });
  desiredOrder.splice(endIndex, 0, ...desiredOrder.splice(startIndex, count));
  return Promise.resolve();
}

function shuffle(now: number): Promise<string> {
  const num = 8;
  var desiredOrder = Array.from(new Array(num))
    .map((_, i) => ({ i, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(({ i }) => i);
  desiredOrder = [0, 1, 6, 7, 5, 3, 4, 2];

  const fs = {
    // basic,
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
      now,
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
  endIndex: number
): Promise<number> {
  const min = 4;
  const size = endIndex - startIndex;
  if (size <= min) {
    return basic(desiredOrder, startIndex, endIndex);
  }
  const midpoint = startIndex + Math.floor(size / 2);
  return Promise.resolve()
    .then(() => [
      divideAndConquer(desiredOrder, startIndex, midpoint),
      divideAndConquer(desiredOrder, midpoint, endIndex),
    ])
    .then((ps) => Promise.all(ps))
    .then((counts) => Math.max(...counts))
    .then(async (count) => {
      const secondHalf = await distributeWindow(
        desiredOrder,
        midpoint,
        endIndex,
        startIndex,
        midpoint
      );
      const firstHalf = await distributeWindow(
        desiredOrder,
        startIndex,
        midpoint,
        midpoint,
        endIndex
      );
      if (!errored && find(desiredOrder, startIndex, endIndex) !== undefined) {
        console.log("error divideAndConquer", {
          startIndex,
          endIndex,
          desiredOrder,
        });
        errored = true;
      }
      return count + secondHalf + firstHalf;
    });
}

async function distributeWindow(
  desiredOrder: number[],
  sourceStart: number,
  sourceEnd: number,
  targetStart: number,
  targetEnd: number
): Promise<number> {
  if (errored) return -1;
  console.log("distributing", {
    sourceStart,
    sourceEnd,
    targetStart,
    targetEnd,
  });
  const getShouldDistribute = () =>
    desiredOrder
      .map((value, currentIndex) => ({ value, currentIndex }))
      .filter(
        ({ currentIndex }) =>
          currentIndex >= sourceStart && currentIndex < sourceEnd
      )
      .map((o) => ({
        ...o,
        direction: o.value >= targetEnd ? 1 : o.value < targetStart ? -1 : 0,
      }))
      .filter(({ direction }) =>
        sourceStart < targetStart ? direction >= 0 : direction <= 0
      );

  const shouldDistribute = getShouldDistribute();
  console.log({
    shouldDistribute,
    desiredOrder,
    x: desiredOrder
      .map((value, currentIndex) => ({ value, currentIndex }))
      .filter(
        ({ currentIndex }) =>
          currentIndex >= sourceStart && currentIndex < sourceEnd
      )
      .map((o) => ({
        ...o,
        direction:
          o.currentIndex >= targetEnd
            ? 1
            : o.currentIndex < targetStart
            ? -1
            : 0,
      })),
  });
  if (shouldDistribute.length === 0) {
    return 0;
  }
  const sourceMid = sourceStart + Math.floor((sourceEnd - sourceStart) / 2);
  const targetMidpoint = desiredOrder
    .map((value, currentIndex) => ({ value, currentIndex }))
    .filter(
      ({ currentIndex }) =>
        currentIndex >= targetStart && currentIndex < targetEnd
    )
    .find(({ value }) => value >= desiredOrder[sourceMid]);
  if (
    targetMidpoint === undefined ||
    targetMidpoint.currentIndex === targetStart
  ) {
    await moveSong(
      sourceStart,
      sourceEnd - sourceStart,
      targetStart,
      desiredOrder
    );
    return 1;
  }
  const secondHalf = await distributeWindow(
    desiredOrder,
    sourceMid,
    sourceEnd,
    targetMidpoint.currentIndex,
    targetEnd + sourceEnd - sourceMid
  );
  const firstHalf = await distributeWindow(
    desiredOrder,
    sourceStart,
    sourceMid,
    targetStart,
    targetMidpoint.currentIndex + sourceMid - sourceStart
  );
  const checkShouldDistribute = getShouldDistribute();
  if (checkShouldDistribute.length > 0) {
    errored = true;
    console.log("error distributeWindow", {
      checkShouldDistribute,
      desiredOrder,
    });
  }
  return secondHalf + firstHalf;
}
