import { OriginalEventBase } from "./event-bridge";
import { Header, Section, SlackMessage, postSlackMessage } from "./slack";

// Ref: https://docs.aws.amazon.com/ja_jp/codebuild/latest/userguide/sample-build-notifications.html#sample-build-notifications-ref
interface CodeBuildOriginalEvent extends OriginalEventBase {
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
}

interface HandlerParameters {
  originalEvent: CodeBuildOriginalEvent;
  slackWebhookUrls: string[];
}

interface Context {
  region: string;
  account: string;
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
  const buildStatus = event.originalEvent.detail["build-status"];

  return {
    type: "header",
    block_id: "header",
    text: {
      type: "plain_text",
      text: `CodeBuild Build State has changed to ${buildStatus}`,
    },
  };
};

const buildFieldsSection = (
  event: HandlerParameters,
  context: Context
): Section => {
  // Name of the CodeBuild project
  const projectName = event.originalEvent.detail["project-name"];

  // Build ARN of CodeBuild
  // e.g. arn:aws:codebuild:us-east-1:123456789012:build/ProjectXX11223-W1omLb3AtUBB:e03db6f7-fec3-4851-b368-687b0ab51809
  const buildArn = event.originalEvent.detail["build-id"];

  // Build status of CodeBuild
  const buildStatus = event.originalEvent.detail["build-status"];

  // Build ID
  // e.g. ProjectXX11223-W1omLb3AtUBB:e03db6f7-fec3-4851-b368-687b0ab51809
  const buildId = buildArn.substring(buildArn.indexOf(projectName));

  // AWS Management Console URL
  const consoleUrl = `https://console.aws.amazon.com/codesuite/codebuild/${context.account}/projects/${projectName}/build/${buildId}?region=${context.region}`;

  const fields = [
    {
      type: "mrkdwn",
      text: `*AWS Management Console URL:*\n${consoleUrl}`,
    },
    {
      type: "mrkdwn",
      text: `*Project Name:*\n${projectName}`,
    },
    {
      type: "mrkdwn",
      text: `*Build ARN:*\n${buildId}`,
    },
    {
      type: "mrkdwn",
      text: `*Build Status:*\n${buildStatus}`,
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
    region: getParametersFromEnvVar("REGION", "us-east-1"),
    account: getParametersFromEnvVar("ACCOUNT", "123456789012"),
  };

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
