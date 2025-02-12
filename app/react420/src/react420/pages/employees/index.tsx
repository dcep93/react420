import { useState } from "react";
import { Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { printF } from "../../Catalog";
import data_raw from "./data.json";
import getData, { DataType } from "./getData";

const data: DataType[] = data_raw;

export default function Employees() {
  const [months, updateMonths] = useState(24);
  const [percentile, updatePercentile] = useState(0.5);
  const tab: number[] = [];
  const mapped = clog(
    data
      .flatMap((d, index) => [
        { t: d.start, index, is_start: true },
        { t: d.end, index, is_start: false },
      ])
      .filter((o) => o.t > 0) // t is 0 if never sent a message
      .filter((o) => o.t < data[0].start - 60 * 60 * 24 * 10)
      .map((o) => ({ ...o, future: o.t + (months * 60 * 60 * 24 * 365) / 12 }))
      .sort((a, b) => a.t - b.t)
      .map((o) => {
        if (o.is_start) {
          tab.push(o.index);
        } else {
          tab.splice(tab.indexOf(o.index), 1);
        }
        return {
          t: o.t,
          index: o.index,
          num_employees: tab.length,
          percent_here_in_months:
            o.future > Date.now() / 1000
              ? 0
              : tab.filter((index) => data[index].end >= o.future).length /
                tab.length,
          percentile_tenure:
            (o.t -
              data[tab[Math.floor((tab.length - 1) * (1 - percentile))]]
                ?.start) /
            (60 * 60 * 24 * 365),
        };
      })
  );
  const [sortKey, updateSortKey] = useState("sortByStart");
  const [filterActive, updateFilterActive] = useState(false);
  const tableData = data.filter(
    (d) => !filterActive || Date.now() / 1000 - d.end < 60 * 60 * 24 * 90 // 90 days
  );
  return (
    <div>
      <div>
        <pre style={{ whiteSpace: "pre-wrap" }}>{printF(getData)}</pre>
      </div>
      <div>
        {data.length !== 0 && (
          <div>
            <div>
              <h1>num_employees</h1>
              <LineChart data={mapped} width={1000} height={300}>
                <XAxis
                  dataKey={"t"}
                  type={"number"}
                  scale={"time"}
                  domain={[mapped[0].t]}
                  tickFormatter={(tick) =>
                    new Date(tick * 1000).toLocaleDateString()
                  }
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(tick) =>
                    new Date(tick * 1000).toLocaleDateString()
                  }
                />
                <Line type="linear" dataKey={"num_employees"} />
              </LineChart>
            </div>
            <div>
              <h1>
                percent_here_in_months
                <input
                  type={"range"}
                  defaultValue={months}
                  min={6}
                  max={60}
                  onChange={(e) => updateMonths(parseInt(e.target.value))}
                />{" "}
                {months}
              </h1>
              <LineChart data={mapped} width={1000} height={300}>
                <XAxis
                  dataKey={"t"}
                  type={"number"}
                  scale={"time"}
                  domain={[mapped[0].t]}
                  tickFormatter={(tick) =>
                    new Date(tick * 1000).toLocaleDateString()
                  }
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(tick) =>
                    new Date(tick * 1000).toLocaleDateString()
                  }
                />
                <Line type="linear" dataKey={"percent_here_in_months"} />
              </LineChart>
            </div>
            <div>
              <h1>
                percentile_tenure
                <input
                  type={"range"}
                  defaultValue={percentile}
                  min={0.1}
                  max={1}
                  step={0.01}
                  onChange={(e) => updatePercentile(parseFloat(e.target.value))}
                />{" "}
                {percentile}
              </h1>
              <LineChart data={mapped} width={1000} height={300}>
                <XAxis
                  dataKey={"t"}
                  type={"number"}
                  scale={"time"}
                  domain={[mapped[0].t]}
                  tickFormatter={(tick) =>
                    new Date(tick * 1000).toLocaleDateString()
                  }
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(tick) =>
                    new Date(tick * 1000).toLocaleDateString()
                  }
                />
                <Line type="linear" dataKey={"percentile_tenure"} />
              </LineChart>
            </div>
          </div>
        )}
      </div>
      <div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={filterActive}
              onChange={(e) => updateFilterActive(!filterActive)}
            />{" "}
            filter inactive 90 days
          </label>
        </div>
        <div>{tableData.length} entries</div>
        <div>
          {["sortByStart", "sortByEnd", "sortByTenure"].map((t, i) => (
            <div key={i}>
              <label>
                <input
                  type="radio"
                  checked={t === sortKey}
                  value={t}
                  onChange={(e) => updateSortKey(e.currentTarget.value)}
                />
                <span>{t}</span>
              </label>
            </div>
          ))}
        </div>
        <table>
          <tbody>
            {tableData
              .map((d) => ({
                d,
                s: {
                  sortByStart: d.start,
                  sortByEnd: -d.end,
                  sortByTenure: d.start - d.end,
                }[sortKey]!,
              }))
              .sort((a, b) => a.s - b.s)
              .map(({ d }) => d)
              .map((d, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{d.username || d.id}</td>
                  <td>{new Date(d.start * 1000).toDateString()}</td>
                  <td>{new Date(d.end * 1000).toDateString()}</td>
                  <td>
                    {((d.end - d.start) / (60 * 60 * 24 * 365)).toFixed(2)}{" "}
                    years
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function clog<T>(t: T): T {
  console.log(t);
  return t;
}
// num employees
// % of employees from x months ago that are still here
// px tenure
