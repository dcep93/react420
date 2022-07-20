import Catalog from "./Catalog";
import ff from "./pages/ff";

import { BrowserRouter } from "react-router-dom";

const pages = { ff };

function index() {
  return (
    <BrowserRouter>
      <Catalog location={"react420"} pages={pages} />
    </BrowserRouter>
  );
}

export default index;
