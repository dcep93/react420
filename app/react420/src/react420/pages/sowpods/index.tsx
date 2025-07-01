import { useEffect, useState } from "react";

type Dictionary = { [word: string]: string };

export default function Sowpods() {
  const [dictionary, update] = useState({} as Dictionary);
  useEffect(() => {
    Promise.resolve()
      .then(() => fetch("/dictionary.json"))
      .then((resp) => resp.json())
      .then((data: { word: string; pos: string }[]) =>
        data.map((d) => [d.word, d.pos])
      )
      .then((entries) => Object.fromEntries(entries))
      .then(update);
  }, []);
  return (
    <div>
      <div>
        {Object.keys(dictionary)
          .sort()
          .map((w) => getTurncoat(w, dictionary))
          .filter((words) => words.length > 0)
          .map((w, i) => (
            <div key={i}>
              {i + 1}: {JSON.stringify(w)}
            </div>
          ))}
      </div>
    </div>
  );
}

function getTurncoat(word: string, dictionary: Dictionary): string[] {
  for (let i = 1; i < word.length; i++) {
    const turn = word.slice(0, i);
    const coat = word.slice(i, word.length);
    if (dictionary[turn] === "v." && dictionary[coat] === "n.") {
      return [turn, coat];
    }
  }
  return [];
}
