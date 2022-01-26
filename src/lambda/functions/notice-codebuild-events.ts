import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import * as util from "util";

// Ref: https://docs.aws.amazon.com/ja_jp/codebuild/latest/userguide/sample-build-notifications.html#sample-build-notifications-ref
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
      "build-status": string;
      "project-name": string;
      "build-id": string;
      "additional-information": {
        artifact: {
          md5sum: string;
          sha256sum: string;
          location: string;
        };
        environment: {
          image: string;
          "privileged-mode": boolean;
          "compute-type": string;
          type: string;
          "environment-variables": string[];
        };
        "timeout-in-minutes": number;
        "build-complete": boolean;
        initiator: string;
        "build-start-time": string;
        source: {
          location: string;
          type: string;
        };
        logs: {
          "group-name": string;
          "stream-name": string;
          "deep-link": string;
        };
        phases: {
          "phase-context": string[];
          "start-time": string;
          "end-time": string;
          "duration-in-seconds": number;
          "phase-type": string;
          "phase-status": string;
        }[];
        "current-phase": string;
        "current-phase-context": string[];
        version: string;
      };
    };
  };
  slackWebhookUrls: string[];
}

interface SlackMessage {
  blocks: {
    type: string;
    block_id?: string;
    text?: { type: string; text: string };
    fields?: { type: string; text: string }[];
  }[];
}

// Function to request Slack
const requestSlack = async (
  slackWebhookUrl: string,
  slackMessage: SlackMessage
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
): Promise<string | Error> => {
  // If the required environment variables do not exist, the process is exited
  if (!process.env["REGION"]) {
    throw new Error(
      `The region name environment variable (REGION) is not specified. e.g. us-east-1`
    );
  }
  if (!process.env["ACCOUNT"]) {
    throw new Error(
      `The AWS Account ID environment variable (ACCOUNT) is not specified. e.g. 123456789012`
    );
  }

  console.log(`event : ${JSON.stringify(event, null, 2)}`);

  const region: string = process.env["REGION"];
  const account: string = process.env["ACCOUNT"];

  // Define Slack message templates
  const slackMessage: SlackMessage = {
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

  // Index of each block
  const headerIndex = slackMessage.blocks.findIndex(
    (block) => block.block_id === "header"
  );
  const fieldsSectionIndex = slackMessage.blocks.findIndex(
    (block) => block.block_id === "fieldsSection"
  );

  // Name of the CodeBuild project
  const projectName = event.originalEvent.detail["project-name"];

  // Build ID of CodeBuild
  const buildId = event.originalEvent.detail["build-id"];

  // Build status of CodeBuild
  const buildStatus = event.originalEvent.detail["build-status"];

  // AWS Management Console URL
  const consoleUrl = `https://console.aws.amazon.com/codesuite/codebuild/${account}/projects/${projectName}/build/${buildId.substring(
    buildId.indexOf(projectName)
  )}?region=${region}`;

  // Construct a Slack message
  slackMessage.blocks[
    headerIndex
  ].text!.text = `CodeBuild Build State has changed to ${buildStatus}`;

  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*AWS Management Console URL:*\n${consoleUrl}`,
  });
  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*Project Name:*\n${projectName}`,
  });
  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*Build ARN:*\n${buildId}`,
  });
  slackMessage.blocks[fieldsSectionIndex].fields?.push({
    type: "mrkdwn",
    text: `*Build Status:*\n${buildStatus}`,
  });

  console.log(`slackMessage : ${JSON.stringify(slackMessage, null, 2)}`);

  // Send a message to the specified Slack webhook URL
  const responses = await Promise.all(
    event.slackWebhookUrls.map((slackWebhookUrl) =>
      requestSlack(slackWebhookUrl, slackMessage)
    )
  );
  return util.inspect(responses);
};
