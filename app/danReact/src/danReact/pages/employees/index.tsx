import { useState } from "react";
import { Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { printF } from "../../Catalog";
import data_raw from "./data.json";
import getData, { DataType } from "./getData";

const data: DataType[] = data_raw;

export default function Employees() {
  const slackURL = "https://app.slack.com/client/T024H38KR/C3G14QKPS";

  const [months, updateMonths] = useState(24);
  const [percentile, updatePercentile] = useState(0.5);
  const tab: number[] = [];
  var num_started = 0;
  var num_ended = 0;

  const metrics: {
    key: string;
    f: (t: number) => number;
    g: () => any;
  }[] = [
    {
      key: "num_employees",
      f: (t) => data.filter((d) => d.start <= t && d.end >= t).length,
      g: () => null,
    },
    {
      key: "num_started_this_month",
      f: (t) =>
        data.filter((d) => Math.abs(d.start - t) <= 30 * 24 * 60 * 60).length,
      g: () => null,
    },
    {
      key: "num_ended_this_month",
      f: (t) =>
        data.filter((d) => Math.abs(d.end - t) <= 30 * 24 * 60 * 60).length,
      g: () => null,
    },
    {
      key: "percent_here_in_months",
      f: (t) =>
        ((future) =>
          future > Date.now() / 1000
            ? 0
            : tab.filter((index) => data[index].end >= future).length /
              tab.length)(t + (months * 60 * 60 * 24 * 365) / 12),
      g: () => (
        <span>
          <input
            type={"range"}
            defaultValue={months}
            min={6}
            max={60}
            onChange={(e) => updateMonths(parseInt(e.target.value))}
          />{" "}
          {months}
        </span>
      ),
    },
    {
      key: "percentile_tenure",
      f: (t) =>
        (t -
          data[tab[Math.floor((tab.length - 1) * (1 - percentile))]]?.start) /
        (60 * 60 * 24 * 365),
      g: () => (
        <span>
          <input
            type={"range"}
            defaultValue={percentile}
            min={0.1}
            max={1}
            step={0.01}
            onChange={(e) => updatePercentile(parseFloat(e.target.value))}
          />{" "}
          {percentile}
        </span>
      ),
    },
  ];

  const sorted = data
    .flatMap((d, index) => [
      { t: d.start, index, is_start: true },
      { t: d.end, index, is_start: false },
    ])
    .filter((o) => o.t < Date.now() / 1000 - 60 * 60 * 24 * 60) // lots of recency noise
    .sort((a, b) => a.t - b.t);

  const mapped = clog(
    sorted.map((o) => {
      if (o.is_start) {
        num_started++;
        tab.push(o.index);
      } else {
        num_ended++;
        tab.splice(tab.indexOf(o.index), 1);
      }
      return {
        t: o.t,
        index: o.index,
        ...Object.fromEntries(metrics.map((m) => [m.key, m.f(o.t)])),
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
        <a href={slackURL}>{slackURL}</a>
      </div>
      <div>
        <pre style={{ whiteSpace: "pre-wrap" }}>{printF(getData)}</pre>
      </div>
      <div>
        {data.length !== 0 && (
          <div>
            {metrics.map((m, i) => (
              <div key={i}>
                <h1>
                  <span>{m.key}</span>
                  <span>{m.g()}</span>
                </h1>
                <LineChart data={mapped} width={1400} height={300}>
                  <XAxis
                    dataKey={"t"}
                    type={"number"}
                    scale={"time"}
                    domain={[]}
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
                  <Line type="linear" dataKey={m.key} />
                </LineChart>
              </div>
            ))}
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
