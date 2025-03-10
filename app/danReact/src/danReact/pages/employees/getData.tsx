export type DataType = {
  start: number;
  end: number;
  id: string;
  username?: string;
};

export default function getData(): Promise<any> {
  const tsCutoff = "1514764800";
  const urlParts = window.location.href.split("?")[0].split("/");
  const slack_route = urlParts[4];
  const channel = urlParts[5];
  const token = JSON.parse(localStorage.localConfig_v2).teams[slack_route]
    .token;
  function clog<T>(t: T): T {
    setTimeout(() => console.log(t), 500);
    return t;
  }

  var errored = false;
  var tickets = 4;
  const sleepMs = tickets * 1500;
  const queue: (() => void)[] = [];
  function getTicket(): Promise<void> {
    if (errored) throw new Error("cancelled");
    if (tickets > 0) {
      tickets--;
      return Promise.resolve();
    }
    return new Promise((resolve) => queue.push(resolve));
  }

  function releaseTicket<T>(t: T) {
    const p = queue.shift();
    if (p && !errored) {
      setTimeout(p, sleepMs);
    } else {
      tickets++;
    }
    return t;
  }

  function fetchMultipart(
    url: string,
    body: { [key: string]: any }
  ): Promise<any> {
    const boundary = "----WebKitFormBoundaryCva22mPHuiAmPFzo";
    return Promise.resolve()
      .then(getTicket)
      .then(() =>
        fetch(url, {
          headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": `multipart/form-data; boundary=${boundary}`,
            "sec-ch-ua":
              '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
          },
          referrerPolicy: "no-referrer",
          body:
            Object.entries(body)
              .map(([k, v]) => `"${k}"\r\n\r\n${v}\r\n`)
              .concat("")
              .reverse()
              .join(`--${boundary}\r\nContent-Disposition: form-data; name=`) +
            `--${boundary}--\r\n`,
          method: "POST",
          mode: "cors",
          credentials: "include",
        })
      )
      .then(releaseTicket)
      .then((resp) => {
        if (!resp.ok) {
          errored = true;
        }
        return resp;
      })
      .then((resp) => resp.json())
      .catch((err) => {
        errored = true;
        throw err;
      });
  }
  type JoinType = { [user: string]: string };
  function getJoins(joins: JoinType, latest: string): Promise<JoinType> {
    clog([
      "getJoins",
      new Date(parseFloat(latest) * 1000),
      Object.keys(joins).length,
      joins,
    ]);
    return fetchMultipart(
      `https://quizlet.slack.com/api/conversations.history?_x_id=1d71f1f5-${
        Date.now() / 1000
      }&slack_route=T024H38KR&_x_version_ts=1729825956&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=59&_x_num_retries=0`,
      {
        token,
        channel,
        limit: 100,
        ignore_replies: true,
        latest,
      }
    ).then(
      (resp: {
        messages: {
          ts: string;
          user: string;
          subtype: string;
          reply_users: string[];
          blocks?: {
            elements: { elements: { type: string; user_id: string }[] }[];
          }[];
          reactions?: { users: string[] }[];
        }[];
      }) =>
        resp.messages.length === 0
          ? joins
          : Promise.resolve()
              .then(() =>
                resp.messages.flatMap((result) =>
                  result.subtype === "channel_join"
                    ? [[result.user, result.ts]]
                    : ([] as string[])
                        .concat(result.reply_users || [])
                        .concat(
                          (result.blocks || []).flatMap(({ elements }) =>
                            (elements || [])
                              .filter(({ elements }) => elements)
                              .flatMap(({ elements }) => elements)
                              .filter(({ type }) => type === "user")
                              .map(({ user_id }) => user_id)
                          )
                        )
                        .concat(
                          (result.reactions || []).flatMap(({ users }) => users)
                        )
                        .filter((user) => user.startsWith("U"))
                        .map((user) => [user, result.ts])
                )
              )
              .then((additionalJoins) =>
                getJoins(
                  {
                    ...joins,
                    ...Object.fromEntries(
                      additionalJoins.sort(
                        (a, b) => parseFloat(b[1]) - parseFloat(a[1])
                      )
                    ),
                  },
                  resp.messages[resp.messages.length - 1].ts
                )
              )
    );
  }
  function getDataFromJoins(joins: JoinType): Promise<DataType[]> {
    var count = 0;
    return Promise.resolve()
      .then(() => new Promise((resolve) => setTimeout(resolve, 30 * 1000)))
      .then(() =>
        Object.entries(joins).map(([user, timestamp]) =>
          Promise.resolve()
            .then(() =>
              fetchMultipart(
                `https://quizlet.slack.com/api/search.modules.messages?_x_id=ee504506-${
                  Date.now() / 1000
                }&_x_csid=eXhCJXGNwM0&slack_route=T024H38KR&_x_version_ts=1729832273&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=59&_x_num_retries=0`,
                {
                  token,
                  module: "messages",
                  query: `from:<@${user}>`,
                  page: 1,
                  count: 1,
                  sort: "timestamp",
                  sort_dir: "desc",
                }
              )
            )
            .then(
              (latestResp: {
                items: {
                  messages: { ts: string; username: string }[];
                }[];
              }) => latestResp.items?.[0]?.messages[0]
            )
            .then((latestMessage) =>
              (!latestMessage || timestamp > tsCutoff
                ? Promise.resolve({
                    items: [{ messages: [{ ts: timestamp }] }],
                  })
                : fetchMultipart(
                    `https://quizlet.slack.com/api/search.modules.messages?_x_id=ee504506-${
                      Date.now() / 1000
                    }&_x_csid=eXhCJXGNwM0&slack_route=T024H38KR&_x_version_ts=1729832273&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=59&_x_num_retries=0`,
                    {
                      token,
                      module: "messages",
                      query: `from:<@${user}>`,
                      page: 1,
                      count: 1,
                      sort: "timestamp",
                      sort_dir: "asc",
                    }
                  )
              ).then(
                (earliestResp: {
                  items: {
                    messages: { ts: string; username: string }[];
                  }[];
                }) =>
                  ((_) => ({
                    id: user,
                    username: latestMessage?.username,
                    start: parseFloat(earliestResp.items[0].messages[0].ts),
                    end: parseFloat(latestMessage?.ts || timestamp),
                  }))(
                    clog({
                      user: latestMessage?.username || user,
                      count: count++,
                      total: Object.keys(joins).length,
                    })
                  )
              )
            )
            .catch((err) => {
              clog({ err, user });
              throw err;
            })
        )
      )
      .then((ps) => Promise.all(ps));
  }
  return Promise.resolve()
    .then(() => getJoins({}, (Date.now() / 1000).toFixed(6)))
    .then(getDataFromJoins)
    .then((data) => JSON.stringify(data))
    .then(clog);
}
