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
      .slice(startIndex, endIndex)
      .map((value, i) => ({ value, currentIndex: i + startIndex }))
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
    if (size <= 1) {
      return Promise.resolve(0);
    }
    return Promise.resolve().then(async () => {
      if (desiredOrder[startIndex] > desiredOrder[startIndex + 1]) {
        await moveSong(startIndex + 1, 1, startIndex, desiredOrder);
        return 1;
      }
      return 0;
    });
  }
  const midpoint = getMidpoint(startIndex, endIndex);
  const getSubcount = () =>
    size <= min
      ? Promise.resolve(0)
      : Promise.resolve()
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
    x.push([]);

    const subdistribute = await distribute(desiredOrder, startIndex, endIndex);
    x.push(desiredOrder.slice());

    console.log({ x, startIndex, endIndex, subdistribute });

    if (subdistribute !== 0) {
      throw new Error("divideAndConquer.subdistribute");
    }

    const isValid =
      desiredOrder
        .slice(startIndex, endIndex)
        .map((value, i) => ({ value, currentIndex: i + startIndex }))
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
      console.log({ startIndex, endIndex });
      throw new Error("divideAndConquer.isValid");
    }

    return count + distributeCount + subcount;
  });
}

setTimeout(() => {
  var x = [7, 3, 4, 1, 9, 5, 15, 6, 10, 13, 8, 11, 14, 0, 2, 12];
  x = [0, 0, 0, 0, 0, 0, 0, 0, 12, 7, 8, 4, 1, 11, 2, 6];
  divideAndConquer(x, 8, 16).then((d) => console.log(x, d));
}, 100);

async function distribute(
  desiredOrder: number[],
  startIndex: number,
  endIndex: number
): Promise<number> {
  const d = desiredOrder.slice();
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
      .slice(midpoint, endIndex)
      .map((value, i) => ({ value, currentIndex: i + midpoint }))
      .reverse()
      .find(({ value }) => value < midpoint);
    if (pivot === undefined) {
      const destination = desiredOrder
        .slice(startIndex, midpoint)
        .map((value, i) => ({ value, currentIndex: i + startIndex }))
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
      .slice(startIndex, midpoint)
      .map((value, i) => ({ value, currentIndex: i + startIndex }))
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
    if (desiredOrder[midpoint] >= endIndex) {
      return undefined;
    }
    const destinationIndex = desiredOrder
      .slice(startIndex, midpoint)
      .map((value, i) => ({ value, currentIndex: i + startIndex }))
      .find(({ value }) => value >= endIndex)?.currentIndex;
    if (destinationIndex === undefined) {
      return undefined;
    }
    return {
      sourceIndex: midpoint,
      size: endIndex - midpoint,
      destinationIndex,
    };
  };
  // patch one by one
  // could be improved
  const getZPivot = () => {
    const sourceIndex = desiredOrder
      .slice(startIndex, endIndex)
      .map((value, i) => ({ value, currentIndex: i + startIndex }))
      .slice(1)
      .reverse()
      .find(
        ({ value, currentIndex }) => value < desiredOrder[currentIndex - 1]
      )?.currentIndex;
    if (sourceIndex === undefined) {
      return undefined;
    }
    const destinationIndex = desiredOrder
      .slice(startIndex, sourceIndex)
      .map((value, i) => ({ value, currentIndex: i + startIndex }))
      .reverse()
      .find(
        ({ value, currentIndex }) =>
          currentIndex === startIndex || value < desiredOrder[sourceIndex]
      )?.currentIndex;
    if (destinationIndex === undefined) {
      return undefined;
    }
    const sourceEnd = (
      desiredOrder
        .slice(sourceIndex + 1, endIndex)
        .map((value, i) => ({ value, currentIndex: i + sourceIndex + 1 }))
        .find(({ value }) => value > desiredOrder[sourceIndex - 1]) || {
        currentIndex: endIndex,
      }
    ).currentIndex;
    return {
      sourceIndex,
      size: sourceEnd - sourceIndex,
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
  console.log({ startIndex, endIndex, d });
  for (let i = startIndex; i < endIndex; i++) {
    const zPivot = getZPivot();
    console.log({ zPivot, x: desiredOrder.slice() });
    if (zPivot === undefined) {
      return count;
    }
    count++;
    await moveSong(
      zPivot.sourceIndex,
      zPivot.size,
      zPivot.destinationIndex,
      desiredOrder
    );
  }
  console.log({ startIndex, endIndex });
  throw new Error("distribute.getZPivot.max");
}
