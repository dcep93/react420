import { Link, Route, Routes } from "react-router-dom";

function Catalog(props: {
  location: string;
  pages: { [k: string]: () => JSX.Element };
}) {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div>
            <div>welcome to {props.location}</div>
            <ul>
              {Object.keys(props.pages).map((k) => (
                <li key={k}>
                  <Link to={`./${k}`}>{k}</Link>
                </li>
              ))}
            </ul>
          </div>
        }
      />
      {Object.entries(props.pages).map(([k, V]) => (
        <Route key={k} path={`/${k}/*`} element={<V />} />
      ))}
    </Routes>
  );
}

export function printF(
  f: (...args: any[]) => any,
  argsStr: string = ""
): string {
  return `${f
    .toString()
    .split("\n")
    .map((i) => i.replace(/\/\/$/, "").split("// ")[0].trim())
    .join(" ")}; ${f.name}(${argsStr})`;
}

export default Catalog;
