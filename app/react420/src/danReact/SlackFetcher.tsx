import { printF } from "./Catalog";

export type SlackMessage = {
  ts: string;
  user: string;
  text: string;
};

export default function SlackFetcher(
  filter_: (s: SlackMessage) => boolean,
  stop_: (s: SlackMessage) => boolean
): string {
  function SlackFetcherF(
    filter: (s: SlackMessage) => boolean,
    stop: (s: SlackMessage) => boolean
  ) {
    const sleepMs = 1000;
    const urlParts = window.location.href.split("?")[0].split("/");
    const slack_route = urlParts[4];
    const channel = urlParts[5];
    const token = JSON.parse(localStorage.localConfig_v2).teams[slack_route]
      .token;
    // could parallelize with divide and conquer
    // would need to know stop timestamp, instead of
    // a stop function
    function SlackFetcherFSub(
      data: SlackMessage[],
      latest: string
    ): Promise<SlackMessage[]> {
      console.log({
        latest,
        l: new Date(parseFloat(latest) * 1000),
        count: data.length,
      });
      return fetchMultipart(
        `https://quizlet.slack.com/api/conversations.history?_x_id=1d71f1f5-${
          Date.now() / 1000
        }&slack_route=${slack_route}&_x_version_ts=1729825956&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=59&_x_num_retries=0`,
        {
          token,
          channel,
          limit: 28,
          ignore_replies: true,
          latest,
        }
      ).then((resp: { messages: SlackMessage[] }) =>
        !resp.messages
          ? Promise.resolve()
              .then(() => console.log({ resp }))
              .then(() => data)
          : Promise.resolve()
              .then(() =>
                resp.messages.map((m) => ({
                  ts: m.ts,
                  user: m.user,
                  text: m.text,
                }))
              )
              .then((chunk) => chunk.reverse().filter(filter).concat(data))
              .then((data) =>
                stop(data[0])
                  ? data
                  : new Promise((resolve) => setTimeout(resolve, sleepMs)).then(
                      () =>
                        SlackFetcherFSub(
                          data,
                          resp.messages[resp.messages.length - 1].ts
                        )
                    )
              )
      );
    }
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
    return SlackFetcherFSub([], (Date.now() / 1000).toFixed(6)).then(
      console.log
    );
  }
  return printF(SlackFetcherF, `${filter_.toString()},${stop_.toString()}`);
}
