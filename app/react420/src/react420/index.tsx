import Catalog from "./Catalog";

import { BrowserRouter } from "react-router-dom";

const pages = {};

function index() {
  return (
    <BrowserRouter>
      <Catalog location={"react420"} pages={pages} />
    </BrowserRouter>
  );
}

export default index;
