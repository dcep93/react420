import { Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import SlackFetcher, { SlackMessage } from "../../SlackFetcher";
import data_raw from "./data.json";

const data = data_raw as unknown as {
  git: { timestamp: number; hash: string }[];
  slack: SlackMessage[];
};

// git log --since=@$(date -v-180d +%s 2>/dev/null || date -d "180 days ago" +%s) --pretty=format:'{"hash": "%H", "timestamp": %ct}' --reverse | jq -c -s .

export default function DeployLocks() {
  const maxAge = 180;
  const mappedSlack = data.slack.map((d) => ({
    ...d,
    timestamp: parseFloat(d.ts),
    hasBeen: d.text.split("web`> has been ")[1] || "",
  }));
  function isDeploy(slackText: string, gitIndex: number): boolean {
    if (!slackText.startsWith(":rocket:")) return false;
    const deployHash = slackText.split("commit/")[1]?.split("|")[0];
    for (let i = 0; i < 100; i++) {
      if (data.git[gitIndex + i]?.hash === deployHash) {
        return true;
      }
    }
    return false;
  }
  const gitData = data.git.map((d, gitIndex) => ({
    ...d,
    duration:
      (mappedSlack.find(
        (s) => s.timestamp > d.timestamp && isDeploy(s.text, gitIndex)
      )?.timestamp || 100) - d.timestamp,
  }));
  const lockData = mappedSlack
    .map((d) => ({
      ...d,
      lock: d.hasBeen.startsWith("locked")
        ? 1
        : d.hasBeen.startsWith("unlocked")
        ? -1
        : 0,
    }))
    .filter((d) => d.lock !== 0)
    .reduce(
      (prev, curr) =>
        curr.lock === 1
          ? {
              timestamp: curr.timestamp,
              locks:
                prev.timestamp === 0
                  ? prev.locks
                  : prev.locks.concat({
                      timestamp: prev.timestamp,
                      duration: NaN,
                    }),
            }
          : {
              timestamp: 0,
              locks: (prev.timestamp !== 0
                ? prev.locks
                : prev.locks.concat({
                    timestamp: curr.timestamp,
                    duration: NaN,
                  })
              ).concat({
                timestamp: prev.timestamp,
                duration: curr.timestamp - prev.timestamp,
              }),
            },
      {
        timestamp: 0,
        locks: [] as { timestamp: number; duration: number }[],
      }
    ).locks;
  const today = new Date(new Date().toLocaleDateString());
  const days = Array.from(new Array(maxAge))
    .map((_, i) => maxAge - i)
    .map((age) => {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - age);
      return d.getTime() / 1000;
    })
    .map((timestamp) => ({
      timestamp,
      lockHours: parseFloat(
        lockData
          .filter(
            (l) =>
              l.timestamp >= timestamp &&
              l.timestamp <= timestamp + 60 * 60 * 24
          )
          .map((l) => l.duration / (60 * 60))
          .reduce((a, b) => a + b, 0)
          .toFixed(2)
      ),
      commits: gitData
        .filter(
          (l) =>
            l.timestamp >= timestamp && l.timestamp <= timestamp + 60 * 60 * 24
        )
        .map((l) => l.duration / (60 * 60))
        .filter((d) => d < 24)
        .sort((a, b) => a - b),
    }))
    .map((d) => ({
      ...d,
      lockHours:
        d.lockHours === 0 ? undefined : d.lockHours > 12 ? -1 : d.lockHours,
      numCommits: d.commits.length,
      p50: d.commits[Math.floor(d.commits.length * 0.5)],
      p90: d.commits[Math.floor(d.commits.length * 0.9)],
      max: d.commits[d.commits.length - 1],
    }));
  console.log(days);
  return (
    <div>
      <div>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {SlackFetcher(
            (s) => s.user === "U01ABDUQKTN",
            (s) => s.ts <= "1699294562"
          )}
        </pre>
      </div>
      <div>
        {["lockHours", "numCommits", "p50", "p90", "max"].map((dataKey) => (
          <div key={dataKey}>
            <h1>{dataKey}</h1>
            <div>
              <LineChart data={days} width={1200} height={300}>
                <XAxis
                  dataKey={"timestamp"}
                  type={"number"}
                  scale={"time"}
                  domain={[days[0]?.timestamp]}
                  tickFormatter={(tick) =>
                    new Date(tick * 1000).toLocaleDateString()
                  }
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(tick) =>
                    new Date(tick * 1000).toDateString()
                  }
                />
                <Line type="linear" dataKey={dataKey} />
              </LineChart>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
