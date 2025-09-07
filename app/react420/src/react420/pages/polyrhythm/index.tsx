import { useState } from "react";
import PolyrhythmAudio from "./PolyrhythmAudio";

export default function Polyrhythm() {
  const [params, updateParams] = useState({
    period_s: 16,
    countC: 32,
    countG: 31,
  });
  const [playing, updatePlaying] = useState(false);
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
          fontSize: "xxx-large",
        }}
      >
        <span onClick={() => updatePlaying(!playing)}>⏯️</span>
        {Object.entries(params)
          .map(([key, value]) => ({
            key,
            value,
            setValue: (newValue: number) =>
              updateParams(Object.assign({}, params, { [key]: newValue })),
          }))
          .map(({ key, value, setValue }) => (
            <div
              key={key}
              style={{ border: "2px solid black", display: "flex" }}
            >
              <pre>
                {key}: {value}
              </pre>
              <div style={{ width: "1em" }}></div>
              <button onClick={() => setValue(Math.max(1, value - 1))}>
                ⬇
              </button>
              <button onClick={() => setValue(value + 1)}>⬆</button>
            </div>
          ))}
      </div>
      <PolyrhythmAudio {...params} playing={playing} />
    </div>
  );
}
