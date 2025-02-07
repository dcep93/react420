import Catalog from "./Catalog";

import { BrowserRouter } from "react-router-dom";
import Charades from "./pages/charades";
import chords from "./pages/chords";
import DeployLocks from "./pages/deployLocks";
import Employees from "./pages/employees";
import firebaseHacker from "./pages/firebaseHacker";
import quizletEmbed from "./pages/quizletEmbed";

const pages = {
  chords,
  quizletEmbed,
  firebaseHacker,
  Charades,
  DeployLocks,
  Employees,
};

function index() {
  return (
    <BrowserRouter>
      <Catalog location={"react420"} pages={pages} />
    </BrowserRouter>
  );
}

export default index;
