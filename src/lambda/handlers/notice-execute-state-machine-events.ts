import { OriginalEventBase } from "../aws/event-bridge";
import { Header, Section, SlackMessage, postSlackMessage } from "../slack";

// Ref: https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/cw-events.html
interface CodeCommitOriginalEvent extends OriginalEventBase {
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
}
interface HandlerParameters {
  originalEvent: CodeCommitOriginalEvent;
  slackWebhookUrls: string[];
}

interface Context {
  utcOffset: number;
  region: string;
}

const getParametersFromEnvVar = (name: string, example: string): string => {
  const target = process.env[name];

  // If the required environment variables do not exist, the process is exited
  if (target === undefined) {
    throw new Error(
      `The environment variable "${name}" is not specified. e.g. ${example}`
    );
  }
  return target;
};

const buildHeaderSection = (event: HandlerParameters): Header => {
  const executionStatus = event.originalEvent.detail.status;

  return {
    type: "header",
    block_id: "header",
    text: {
      type: "plain_text",
      text: `The status of Step Functions Execution has changed to ${executionStatus}`,
    },
  };
};

const buildFieldsSection = (
  event: HandlerParameters,
  context: Context
): Section => {
  const stateMachineArn = event.originalEvent.detail.stateMachineArn;
  const executionArn = event.originalEvent.detail.executionArn;
  const executionName = event.originalEvent.detail.name;
  const executionStatus = event.originalEvent.detail.status;

  // Time difference from UTC (millisecond)
  const utcOffsetMillisecond =
    (new Date().getTimezoneOffset() + context.utcOffset * 60) * 60 * 1000;

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

  const durationSeconds =
    startDate && stopDate
      ? Math.round((stopDate.getTime() - startDate.getTime()) / 1000)
      : null;

  const consoleUrl = `https://console.aws.amazon.com/states/home?region=${context.region}#/executions/details/${executionArn}`;

  const fields = [
    {
      type: "mrkdwn",
      text: `*AWS Management Console URL:*\n${consoleUrl}`,
    },
    {
      type: "mrkdwn",
      text: `*StateMachine ARN:*\n${stateMachineArn}`,
    },
    {
      type: "mrkdwn",
      text: `*Execution ARN:*\n${executionArn}`,
    },
    {
      type: "mrkdwn",
      text: `*Execution Name:*\n${executionName}`,
    },
    {
      type: "mrkdwn",
      text: `*Execution Status:*\n${executionStatus}`,
    },
    {
      type: "mrkdwn",
      text: `*start Date:*\n${startDateISOString}`,
    },
    {
      type: "mrkdwn",
      text: `*Stop Date:*\n${stopDateISOString}`,
    },
    {
      type: "mrkdwn",
      text: `*Duration Seconds:*\n${durationSeconds}`,
    },
  ];

  return {
    type: "section",
    block_id: "fieldsSection",
    fields,
  };
};

export const handler = async (
  event: HandlerParameters
): Promise<void | Error> => {
  console.log(`event : ${JSON.stringify(event, null, 2)}`);

  const context = {
    utcOffset: Number(
      getParametersFromEnvVar(
        "UTC_OFFSET",
        'For Asia/Tokyo, "9". For America/Los_Angeles, "-8"'
      )
    ),
    region: getParametersFromEnvVar("REGION", "us-east-1"),
  };

  if (context.utcOffset > 14 || context.utcOffset < -12) {
    throw new Error(
      "UTC offset must be less than or equal to 14 and greater than or equal to -12."
    );
  }

  // Define Slack message
  const header = buildHeaderSection(event);
  const fields = buildFieldsSection(event, context);
  const slackMessage: SlackMessage = {
    blocks: [
      header,
      {
        type: "divider",
      },
      fields,
    ],
  };
  console.log(`slackMessage : ${JSON.stringify(slackMessage, null, 2)}`);

  // Send a message to the specified Slack webhook URL
  await Promise.all(
    event.slackWebhookUrls.map((slackWebhookUrl) =>
      postSlackMessage(slackWebhookUrl, slackMessage)
    )
  );

  return;
};
