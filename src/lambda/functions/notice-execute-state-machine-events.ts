import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

// Ref: https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/cw-events.html
interface CodeCommitEvent {
  originalEvent: {
    version: string;
    id: string;
    "detail-type": string;
    source: string;
    account: string;
    time: string;
    region: string;
    resources: string[];
    detail: {
      executionArn: string;
      stateMachineArn: string;
      name: string;
      status: string;
      startDate: number | null;
      stopDate: number | null;
      input: any;
      inputDetails: any;
      output: any;
      outputDetails: any;
    };
  };
  slackWebhookUrls: string[];
}

interface SlackMessgage {
  blocks: {
    type: string;
    block_id?: string;
    text?: { type: string; text: string };
    fields?: { type: string; text: string }[];
  }[];
}

const requestSlack = async (
  slackWebhookUrl: string,
  slackMessage: SlackMessgage
) => {
  return new Promise<AxiosResponse | AxiosError>((resolve, reject) => {
    // Request parameters
    const options: AxiosRequestConfig = {
      url: slackWebhookUrl,
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      data: slackMessage,
    };

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

export const handler = async (
  event: CodeCommitEvent
): Promise<AxiosResponse | AxiosError | void> => {
  if (
    !process.env["UTC_OFFSET"] ||
    isNaN(Number(process.env["UTC_OFFSET"])) ||
    Number(process.env["UTC_OFFSET"]) > 14 ||
    Number(process.env["UTC_OFFSET"]) < -12
  ) {
    console.error(`
      The environment variable for UTC offset (UTC_OFFSET) has not been entered correctly.
      e.g. For Asia/Tokyo, "9". For America/Los_Angeles, "-8".`);
    return;
  }
  if (!process.env["REGION"]) {
    console.log(
      `The region name environment variable (REGION) is not specified.
      e.g. us-east-1`
    );
    return;
  }

  console.log(`event : ${JSON.stringify(event, null, 2)}`);

  const utcOffset: number = Number(process.env["UTC_OFFSET"]);
  const region: string = process.env["REGION"];

  const slackMessage: SlackMessgage = {
    blocks: [
      {
        type: "header",
        block_id: "header",
        text: {
          type: "plain_text",
          text: "",
        },
      },
      {
        type: "divider",
      },
      {
        type: "section",
        block_id: "fieldsSection",
        fields: new Array(),
      },
    ],
  };

  const headerIndex = slackMessage.blocks.findIndex(
    (block) => block.block_id === "header"
  );
  const fieldsSectionIndex = slackMessage.blocks.findIndex(
    (block) => block.block_id === "fieldsSection"
  );

  // Time difference from UTC (millisecond)
  const utcOffsetMillisecond =
    (new Date().getTimezoneOffset() + utcOffset * 60) * 60 * 1000;

  const stateMachineArn = event.originalEvent.detail.stateMachineArn;
  const executionArn = event.originalEvent.detail.executionArn;
  const executionName = event.originalEvent.detail.name;
  const executionStatus = event.originalEvent.detail.status;
  const startDate = event.originalEvent.detail.startDate
    ? new Date(event.originalEvent.detail.startDate + utcOffsetMillisecond)
    : null;

  const stopDate = event.originalEvent.detail.stopDate
    ? new Date(event.originalEvent.detail.stopDate + utcOffsetMillisecond)
    : null;

  const startDateISOString = startDate
    ? startDate.toLocaleString("ja-JP")
    : null;
  const stopDateISOString = stopDate ? stopDate.toLocaleString("ja-JP") : null;

  const durationSecounds =
    startDate && stopDate
      ? Math.round((stopDate.getTime() - startDate.getTime()) / 1000)
      : null;

  const consoleUrl = `https://console.aws.amazon.com/states/home?region=${region}#/executions/details/${executionArn}`;

  slackMessage.blocks[
    headerIndex
  ].text!.text = `The status of Step Functions Execution has changed to ${executionStatus}`;

  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*AWS Management Console URL:*\n${consoleUrl}`,
  });
  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*StateMachine ARN:*\n${stateMachineArn}`,
  });
  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*Execution ARN:*\n${executionArn}`,
  });
  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*Execution Name:*\n${executionName}`,
  });
  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*Execution Stattus:*\n${executionStatus}`,
  });
  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*start Date:*\n${startDateISOString}`,
  });
  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*Stop Date:*\n${stopDateISOString}`,
  });
  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*Duration Secounds:*\n${durationSecounds}`,
  });

  console.log(`slackMessage : ${JSON.stringify(slackMessage, null, 2)}`);

  for (const [index, slackWebhookUrl] of event.slackWebhookUrls.entries()) {
    await requestSlack(slackWebhookUrl, slackMessage);
  }
};
