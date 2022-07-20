import Catalog from "../../Catalog";
import draft from "./Draft";
import sos from "./Sos";

const pages = { sos, draft };

function index() {
  return <Catalog location={"ff"} pages={pages} />;
}

export default index;
