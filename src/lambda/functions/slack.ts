import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

export interface Header {
  type: "header";
  block_id?: string;
  text: {
    type: "plain_text";
    text: string;
  };
}

export interface Section {
  type: "section";
  block_id?: string;
  fields?: SectionField[];
  text?: SectionField;
}

interface SectionField {
  type: string;
  text: string;
}

interface Divider {
  type: "divider";
  block_id?: string;
}

export interface SlackMessage {
  blocks: (Header | Section | Divider)[];
}

export interface Field {
  header: string;
  body: string;
}

export const buildHeader = (text: string): Header => {
  return {
    type: "header",
    block_id: "header",
    text: {
      type: "plain_text",
      text,
    },
  };
};

export const buildBody = (fields: Field[]): Section => {
  return {
    type: "section",
    block_id: "fieldsSection",
    fields: fields.map(({ header, body }) => ({
      type: "mrkdwn",
      text: `*${header}:*\n${body}`,
    })),
  };
};

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
    // POST to Slack Webhook URL
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
