import Catalog from "./Catalog";

import { BrowserRouter } from "react-router-dom";
import Charades from "./pages/charades";
import chords from "./pages/chords";
import firebaseHacker from "./pages/firebaseHacker";
import MarchMadness from "./pages/marchmadness";
import Polyrhythm from "./pages/polyrhythm";
import quizletEmbed from "./pages/quizletEmbed";
import Sowpods from "./pages/sowpods";
import SpotifyShuffler from "./pages/spotifyShuffler";

const pages = {
  Polyrhythm,
  MarchMadness,
  chords,
  quizletEmbed,
  firebaseHacker,
  Charades,
  SpotifyShuffler,
  Sowpods,
};

function index() {
  return (
    <BrowserRouter>
      <Catalog location={"react420"} pages={pages} />
    </BrowserRouter>
  );
}

export default index;
