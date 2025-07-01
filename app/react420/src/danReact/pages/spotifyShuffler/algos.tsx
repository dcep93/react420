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
    const distributeCount = await distribute(
      desiredOrder,
      startIndex,
      endIndex
    );
    const subcount = await getSubcount();

    const subdistribute = await distribute(desiredOrder, startIndex, endIndex);

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

async function distribute(
  desiredOrder: number[],
  startIndex: number,
  endIndex: number
): Promise<number> {
  var midpoint = getMidpoint(startIndex, endIndex);
  const size = desiredOrder
    .slice(startIndex, endIndex)
    .map((value, i) => ({ value, currentIndex: i + startIndex }))
    .sort((a, b) => a.value - b.value)
    .map((o, i) => ({ ...o, sortedIndex: i + startIndex }))
    .filter(
      (o) => o.sortedIndex >= midpoint && o.currentIndex < midpoint
    ).length;
  if (size === 0) {
    return 0;
  }
  const destinationIndex = (
    desiredOrder
      .slice(startIndex, midpoint)
      .map((value, i) => ({ value, currentIndex: i + startIndex }))
      .find(({ value }) => value > desiredOrder[midpoint + size - 1]) || {
      currentIndex: midpoint - 1,
    }
  ).currentIndex;
  await moveSong(midpoint, size, destinationIndex, desiredOrder);
  return 1;
}
