import { moveSong } from ".";

export async function basic(
  desiredOrder: number[],
  startIndex: number,
  endIndex: number
): Promise<number> {
  //   console.log("basic", { startIndex, endIndex });
  var count = 0;
  for (let i = startIndex; i < endIndex; i++) {
    const currentIndex = desiredOrder
      .map((value, currentIndex) => ({ value, currentIndex }))
      .filter(
        ({ currentIndex }) =>
          currentIndex >= startIndex && currentIndex < endIndex
      )
      .sort((a, b) => a.value - b.value)[i - startIndex].currentIndex;
    if (currentIndex === i) {
      continue;
    }
    count++;
    await moveSong(currentIndex, 1, i, desiredOrder);
  }
  return count;
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
    return distribute(desiredOrder, startIndex, endIndex);
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
    const x = [];
    x.push(desiredOrder.slice());
    const distributeCount = await distribute(
      desiredOrder,
      startIndex,
      endIndex
    );
    x.push(desiredOrder.slice());
    const subcount = await getSubcount();
    x.push(desiredOrder.slice());

    const subdistribute = await distribute(desiredOrder, startIndex, endIndex);
    x.push(desiredOrder.slice());

    console.log({ x, startIndex, endIndex });

    if (subdistribute !== 0) {
      throw new Error("divideAndConquer.subdistribute");
    }

    const isValid =
      desiredOrder
        .map((value, currentIndex) => ({ value, currentIndex }))
        .filter(
          ({ currentIndex }) =>
            currentIndex >= startIndex && currentIndex < endIndex
        )
        .map(({ value, currentIndex }) =>
          value < startIndex
            ? currentIndex - endIndex
            : value >= endIndex
            ? currentIndex + endIndex
            : value
        )
        .reduce(
          (prev, curr) => (prev === null ? null : curr > prev ? curr : null),
          Number.NEGATIVE_INFINITY as number | null
        ) !== null;
    if (!isValid) {
      throw new Error("divideAndConquer.isValid");
    }

    return count + distributeCount + subcount;
  });
}

setTimeout(() => {
  const x = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 10, 1, 15];
  distribute(x, 12, 16).then((d) => console.log(x, d));
}, 100);

async function distribute(
  desiredOrder: number[],
  startIndex: number,
  endIndex: number
): Promise<number> {
  var count = 0;
  var midpoint = getMidpoint(startIndex, endIndex);
  // move < midpoint from right to left
  const getXPivot = () => {
    if (desiredOrder[midpoint] >= midpoint) {
      return undefined;
    }
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
    if (midpoint === endIndex) {
      return undefined;
    }
    if (desiredOrder[midpoint - 1] < endIndex) {
      return undefined;
    }
    if (desiredOrder[midpoint] >= endIndex) {
      return undefined;
    }
    const destinationIndex = desiredOrder
      .map((value, currentIndex) => ({ value, currentIndex }))
      .filter(
        ({ currentIndex }) =>
          currentIndex >= startIndex && currentIndex < midpoint
      )
      .find(({ value }) => value >= endIndex)!.currentIndex;
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
