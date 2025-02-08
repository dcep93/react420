import { useEffect, useState } from "react";

var errored = false;

export default function SpotifyShuffler() {
  const [now, updateNow] = useState(0);
  const [data, updateData] = useState("");
  useEffect(() => {
    shuffle(now).then(updateData);
  }, [now]);
  return (
    <div>
      <div onClick={() => updateNow(Date.now())}>spotifyShuffler</div>
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
  return Promise.resolve();
}

function shuffle(now: number): Promise<string> {
  const num = 64;
  const desiredOrder = [29, 38, 52, 56, 60, 18, 41, 34];
  // Array.from(new Array(num))
  //   .map((_, i) => ({ i, r: Math.random() }))
  //   .sort((a, b) => a.r - b.r)
  //   .map(({ i }) => i);

  const fs = { basic, divideAndConquer };

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
    .then((o) => ({ ...o, num, now, errored }))
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
    .map((o, sortedIndex) => ({ ...o, sortedIndex }))
    .find((o) => o.sortedIndex !== o.currentIndex);
}

async function basic(
  desiredOrder: number[],
  startIndex: number,
  endIndex: number
): Promise<number> {
  var count = 0;
  while (count <= endIndex - startIndex) {
    const found = find(desiredOrder, startIndex, endIndex);
    if (found === undefined) {
      return Promise.resolve(count);
    }
    count++;
    await moveSong(
      found.currentIndex + startIndex,
      1,
      found.sortedIndex + startIndex,
      desiredOrder
    );
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
      count += await distributeWindow(
        desiredOrder,
        startIndex,
        midpoint,
        midpoint,
        endIndex
      );
      count += await distributeWindow(
        desiredOrder,
        midpoint,
        endIndex,
        startIndex,
        midpoint
      );
      if (!errored && find(desiredOrder, startIndex, endIndex) !== undefined) {
        console.log({
          desiredOrder,
          startIndex,
          endIndex,
          x: desiredOrder.filter((_, i) => i >= startIndex && i < endIndex),
        });
        errored = true;
      }
      return count;
    });
}

async function distributeWindow(
  desiredOrder: number[],
  sourceStart: number,
  sourceEnd: number,
  targetStart: number,
  targetEnd: number
): Promise<number> {
  const shouldDistribute = desiredOrder
    .map((value, currentIndex) => ({ value, currentIndex }))
    .filter(
      ({ currentIndex }) =>
        currentIndex >= sourceStart && currentIndex < sourceEnd
    )
    .map((o) => ({
      ...o,
      direction:
        o.currentIndex >= targetEnd ? 1 : o.currentIndex < targetStart ? -1 : 0,
    }))
    .filter(({ direction }) =>
      sourceStart < targetStart ? direction >= 0 : direction <= 0
    );
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
  return secondHalf + firstHalf;
}
