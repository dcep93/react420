export type DataType = {
  start: number;
  end: number;
  id: string;
  username?: string;
};

export default function getData(): Promise<void> {
  const urlParts = window.location.href.split("/");
  const slack_route = urlParts[4];
  const channel = urlParts[5];
  const token = JSON.parse(localStorage.localConfig_v2).teams[slack_route]
    .token;
  const data: DataType[] = [];
  var latest = (Date.now() / 1000).toFixed(6);
  const tsCutoff = "1514764800";
  function clog<T>(t: T): T {
    setTimeout(() => console.log(t), 500);
    return t;
  }
  function helper(): Promise<any> {
    clog([new Date(parseFloat(latest) * 1000), Object.keys(data).length]);
    function fetchMultipart(
      url: string,
      body: { [key: string]: any }
    ): Promise<any> {
      const boundary = "----WebKitFormBoundaryCva22mPHuiAmPFzo";
      return fetch(url, {
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
      }).then((resp) => resp.json());
    }
    return fetchMultipart(
      `https://quizlet.slack.com/api/conversations.history?_x_id=1d71f1f5-${
        Date.now() / 1000
      }&slack_route=T024H38KR&_x_version_ts=1729825956&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=59&_x_num_retries=0`,
      {
        token,
        channel,
        limit: 28,
        ignore_replies: true,
        latest,
      }
    ).then(
      (resp: { messages: { ts: string; user: string; subtype: string }[] }) =>
        resp.messages.length === 0
          ? JSON.stringify(data)
          : Promise.resolve()
              .then(() => {
                latest = resp.messages[resp.messages.length - 1].ts;
              })
              .then(() =>
                clog(
                  resp.messages.filter(
                    (result) => result.subtype === "channel_join"
                  )
                ).map((result) =>
                  fetchMultipart(
                    `https://quizlet.slack.com/api/search.modules.messages?_x_id=ee504506-${
                      Date.now() / 1000
                    }&_x_csid=eXhCJXGNwM0&slack_route=T024H38KR&_x_version_ts=1729832273&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=59&_x_num_retries=0`,
                    {
                      token,
                      module: "messages",
                      query: `from:<@${result.user}>`,
                      page: 1,
                      count: 1,
                      sort: "timestamp",
                      sort_dir: "desc",
                    }
                  )
                    .then(
                      (latestResp: {
                        items: {
                          messages: { ts: string; username: string }[];
                        }[];
                      }) => latestResp.items[0]?.messages[0]
                    )
                    .then((latestMessage) =>
                      (!latestMessage || result.ts > tsCutoff
                        ? Promise.resolve({
                            items: [{ messages: [result] }],
                          })
                        : fetchMultipart(
                            `https://quizlet.slack.com/api/search.modules.messages?_x_id=ee504506-${
                              Date.now() / 1000
                            }&_x_csid=eXhCJXGNwM0&slack_route=T024H38KR&_x_version_ts=1729832273&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=59&_x_num_retries=0`,
                            {
                              token,
                              module: "messages",
                              query: `from:<@${result.user}>`,
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
                          clog(latestMessage?.username || result) &&
                          data.push({
                            id: result.user,
                            username: latestMessage?.username,
                            start: parseFloat(
                              earliestResp.items[0].messages[0].ts
                            ),
                            end: parseFloat(latestMessage?.ts || result.ts),
                          })
                      )
                    )
                    .catch((err) => {
                      console.log(result);
                      throw err;
                    })
                )
              )
              .then((ps) => Promise.all(ps))
              .then(() => new Promise((resolve) => setTimeout(resolve, 10_000)))
              .then(helper)
    );
  }
  return Promise.resolve().then(helper).then(clog);
}
