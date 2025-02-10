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

function getMidpoint(startIndex: number, endIndex: number): number {
  const midpoint = Math.floor((startIndex + endIndex) / 2);
  if (midpoint === startIndex) {
    throw new Error("getMidpoint");
  }
  return midpoint;
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
  const midpoint = getMidpoint(startIndex, endIndex);
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
      endIndex
    );
    const subcount = await getSubcount();

    // todo verify
    // [...unorderedBelowStart, ordered, ...unorderedAboveEnd]

    const subdistribute = await distribute(desiredOrder, startIndex, endIndex);

    if (subdistribute !== 0) {
      throw new Error("divideAndConquer.subdistribute");
    }

    return count + distributeCount + subcount;
  });
}

const x = [4, 5, 1, 2, 6, 7, 0, 3];
divideAndConquer(x, 4, 8).then(() => console.log(x));

async function distribute(
  desiredOrder: number[],
  startIndex: number,
  endIndex: number
): Promise<number> {
  var count = 0;
  var midpoint = getMidpoint(startIndex, endIndex);
  // move < midpoint from right to left
  const getXPivot = () => {
    if (desiredOrder[midpoint - 1] < startIndex) {
      return undefined;
    }
    if (
      desiredOrder[midpoint] >= startIndex &&
      desiredOrder[midpoint - 1] < midpoint
    ) {
      return undefined;
    }
    const pivot = desiredOrder
      .map((value, currentIndex) => ({ value, currentIndex }))
      .filter(
        ({ currentIndex }) =>
          currentIndex >= midpoint && currentIndex < endIndex
      )
      .reverse()
      .find(({ value }) => value < midpoint);
    if (pivot === undefined) {
      const destination = desiredOrder
        .map((value, currentIndex) => ({ value, currentIndex }))
        .filter(
          ({ currentIndex }) =>
            currentIndex >= startIndex && currentIndex < midpoint
        )
        .find(({ value }) => value >= endIndex);
      if (destination === undefined) {
        return undefined;
      }
      return {
        sourceIndex: midpoint,
        destinationIndex: destination.currentIndex,
        size: endIndex - midpoint,
      };
    }
    const destinationIndex = desiredOrder
      .map((value, currentIndex) => ({ value, currentIndex }))
      .filter(
        ({ currentIndex }) =>
          currentIndex >= startIndex && currentIndex < midpoint
      )
      .find(({ value }) => value >= startIndex)!.currentIndex;
    return {
      pivot,
      sourceIndex: midpoint,
      destinationIndex,
      size: pivot.currentIndex - midpoint + 1,
    };
  };
  // move >= endIndex from left to right
  const getYPivot = () => {
    if (desiredOrder[midpoint] >= endIndex) {
      return undefined;
    }
    if (
      desiredOrder[midpoint - 1] < endIndex &&
      desiredOrder[midpoint] >= midpoint
    ) {
      return undefined;
    }
    const destinationIndex =
      desiredOrder
        .map((value, currentIndex) => ({ value, currentIndex }))
        .filter(
          ({ currentIndex }) =>
            currentIndex >= startIndex && currentIndex < midpoint
        )
        .find(({ value }) => value > endIndex)!.currentIndex - 1;
    return {
      sourceIndex: midpoint,
      size: endIndex - midpoint,
      destinationIndex,
    };
  };
  const xPivot = getXPivot();
  if (xPivot !== undefined) {
    count++;
    await moveSong(
      xPivot.sourceIndex,
      xPivot.size,
      xPivot.destinationIndex,
      desiredOrder
    );
    midpoint += xPivot.size;
  }
  const yPivot = getYPivot();
  if (yPivot !== undefined) {
    count++;
    await moveSong(
      yPivot.sourceIndex,
      yPivot.size,
      yPivot.destinationIndex,
      desiredOrder
    );
  }
  return count;
}
