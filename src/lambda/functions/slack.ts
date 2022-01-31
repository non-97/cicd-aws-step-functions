import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

interface SlackMessageBlock {
  type: string;
  block_id?: string;
  text?: { type: string; text: string };
  fields?: { type: string; text: string }[];
}

export interface SlackMessage {
  blocks: SlackMessageBlock[];
}

export const postSlackMessage = async (
  slackWebhookUrl: string,
  slackMessage: SlackMessage
) => {
  // Request parameters
  const options: AxiosRequestConfig = {
    url: slackWebhookUrl,
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
    data: slackMessage,
  };

  return new Promise<AxiosResponse | AxiosError>((resolve, reject) => {
    // Request Slack
    axios(options)
      .then((response) => {
        console.log(
          `response data : ${JSON.stringify(response.data, null, 2)}`
        );
        resolve(response);
      })
      .catch((error) => {
        console.error(`response error : ${JSON.stringify(error, null, 2)}`);
        reject(error);
      });
  });
};
