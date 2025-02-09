import { errored, moveSong, setErrored } from ".";

export async function basic(
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
    setErrored();
    console.log("error basic", { startIndex, endIndex, desiredOrder });
  }
  return Promise.resolve(-1);

  function find(
    desiredOrder: number[],
    startIndex: number,
    endIndex: number
  ): { currentIndex: number; sortedIndex: number } | undefined {
    // todo more basic
    return desiredOrder
      .map((value, currentIndex) => ({ value, currentIndex }))
      .filter(
        ({ currentIndex }) =>
          currentIndex >= startIndex && currentIndex < endIndex
      )
      .sort((a, b) => a.value - b.value)
      .map((o, sortedIndex) => ({
        ...o,
        sortedIndex: sortedIndex + startIndex,
      }))
      .find((o) => o.sortedIndex !== o.currentIndex);
  }
}

export function divideAndConquer(
  desiredOrder: number[],
  startIndex: number,
  endIndex: number
): Promise<number> {
  //   console.log("divideAndConquer");
  const min = 2;
  const size = endIndex - startIndex;
  if (size <= min) {
    // todo only swap if in range
    return basic(desiredOrder, startIndex, endIndex);
  }
  const midpoint = Math.floor((startIndex + endIndex) / 2);
  if (midpoint === startIndex) {
    throw new Error("divideAndConquer.midpoint");
  }
  const getSubcount = () =>
    Promise.resolve()
      .then(() => [
        divideAndConquer(desiredOrder, startIndex, midpoint),
        divideAndConquer(desiredOrder, midpoint, endIndex),
      ])
      .then((ps) => Promise.all(ps))
      .then((counts) => Math.max(...counts));
  return getSubcount().then(async (count) => {
    const distributeCount = await distribute(
      desiredOrder,
      startIndex,
      midpoint,
      endIndex
    );
    const subcounts = await getSubcount();

    return count + distributeCount + subcounts;
  });
}

async function distribute(
  desiredOrder: number[],
  startIndex: number,
  midpoint: number,
  endIndex: number
): Promise<number> {
  const getPivot = () => {
    if (desiredOrder[midpoint - 1] < startIndex) {
      return undefined;
    }
    if (
      desiredOrder[midpoint] >= startIndex &&
      desiredOrder[midpoint - 1] < midpoint
    ) {
      return undefined;
    }
    return desiredOrder
      .map((value, currentIndex) => ({ value, currentIndex }))
      .filter(
        ({ currentIndex }) =>
          currentIndex >= midpoint && currentIndex < endIndex
      )
      .reverse()
      .find(({ value }) => value < midpoint);
  };
  const pivot = getPivot();
  if (pivot === undefined) {
    return 0;
  }
  const destinationIndex = desiredOrder
    .map((value, currentIndex) => ({ value, currentIndex }))
    .filter(
      ({ currentIndex }) =>
        currentIndex >= startIndex && currentIndex < midpoint
    )
    .find(({ value }) => value >= startIndex)!.currentIndex;
  const prev = desiredOrder.slice();
  await moveSong(
    midpoint,
    pivot.currentIndex - midpoint + 1,
    destinationIndex,
    desiredOrder
  );
  const subPivot = getPivot();
  if (subPivot !== undefined) {
    console.log({
      startIndex,
      endIndex,
      midpoint,
      pivot,
      subPivot,
      desiredOrder,
      destinationIndex,
      prev,
    });
    throw new Error("distribute.subPivot");
  }
  return 1;
}
