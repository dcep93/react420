import { useState } from "react";
import PolyrhythmAudio from "./PolyrhythmAudio";

export default function Polyrhythm() {
  const [period, updatePeriod] = useState(2);
  const [countC, updateCountC] = useState(4);
  const [countG, updateCountG] = useState(3);
  const [playing, updatePlaying] = useState(false);
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
        <span
          style={{ fontSize: "xxx-large" }}
          onClick={() => updatePlaying(!playing)}
        >
          ⏯️
        </span>
      </div>
      <PolyrhythmAudio
        period={period}
        countC={countC}
        countG={countG}
        playing={playing}
      />
    </div>
  );
}
