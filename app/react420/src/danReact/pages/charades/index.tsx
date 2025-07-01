import { useState } from "react";

import raw_topics from "./topics.json";

const topics = Object.entries(raw_topics).flatMap(([topic, entries]) =>
  entries.map((entry) => ({ topic, entry }))
);

export default function Charades() {
  const [x, update] = useState<any>(null);
  return (
    <div>
      <div>
        <h1>charades</h1>
        <div>
          <button
            onClick={() =>
              update(topics[Math.floor(Math.random() * topics.length)])
            }
          >
            shuffle
          </button>
        </div>
        <div style={{ padding: "10px" }}>
          <h2>{JSON.stringify(x)}</h2>
        </div>
        <ol>
          <li>
            allowed to prepare however you like, interpret however you like,
            perform whatever you like
            <ul>
              <li>
                random chord progression, concerto, dead tune, ed sheeran song,
                'lil diddy, nonsense lyrics
              </li>
              <li>clever covers are preferred</li>
              <li>
                if it's an artist, match style
                <ul>
                  <li>
                    not allowed to play a tune they are known for, but you can
                    steal patterns
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li>guesser should think out loud</li>
          <li>
            performer should practice something related to the topic to showcase
            for next lesson
          </li>
          <li>
            performer can always choose to skip
            <ul>
              <li>
                game is still fun even if guesser might not know, a good excuse
                for them to discover!
              </li>
            </ul>
          </li>
          <li>performer is allowed to give a hint at any time</li>
          <ul>
            <li>
              suggested hints:
              <ul>
                <li>listen for the solo</li>
                <li>this is an artist not known for this instrument</li>
                <li>this is a band</li>
                <li>this is an adjective beginning with the letter P</li>
              </ul>
            </li>
          </ul>
        </ol>
      </div>
    </div>
  );
}
