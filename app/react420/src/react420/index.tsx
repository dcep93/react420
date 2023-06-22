import Catalog from "./Catalog";

import { BrowserRouter } from "react-router-dom";
import chords from "./pages/chords";
import quizletEmbed from "./pages/quizletEmbed";

const pages = { chords, quizletEmbed };

function index() {
  return (
    <BrowserRouter>
      <Catalog location={"react420"} pages={pages} />
    </BrowserRouter>
  );
}

export default index;
