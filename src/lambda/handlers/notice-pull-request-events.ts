import {
  CodeCommitClient,
  GetPullRequestCommand,
  GetCommentsForPullRequestCommand,
} from "@aws-sdk/client-codecommit";

import { OriginalEventBase } from "../aws/event-bridge";
import { Header, Section, SlackMessage, postSlackMessage } from "../slack";

// Ref: https://docs.aws.amazon.com/ja_jp/codecommit/latest/userguide/monitoring-events.html#pullRequestCreated
// - commentOnPullRequestCreated Event
// - commentOnPullRequestUpdated Event
// - pullRequestCreated Event
// - pullRequestSourceBranchUpdated Event
// - pullRequestStatusChanged Event
// - pullRequestMergeStatusUpdated Event
// - pullRequestApprovalStateChanged Event

// Interface for the following events
// - commentOnPullRequestCreated Event
interface CommentOnPullRequestCreatedDetailEvent extends OriginalEventBase {
  detail: {
    afterCommitId: string;
    beforeCommitId: string;
    callerUserArn: string;
    commentId: string;
    displayName: string;
    emailAddress: string;
    event: string;
    inReplyTo: string;
    notificationBody: string;
    pullRequestId: string;
    repositoryId: string;
    repositoryName: string;
  };
}

// Interface for the following events
// - commentOnPullRequestUpdated Event
interface CommentOnPullRequestUpdatedDetailEvent extends OriginalEventBase {
  detail: {
    afterCommitId: string;
    beforeCommitId: string;
    callerUserArn: string;
    commentId: string;
    event: string;
    inReplyTo: string;
    notificationBody: string;
    pullRequestId: string;
    repositoryId: string;
    repositoryName: string;
  };
}

// Interface for the following events
// - pullRequestCreated Event
// - pullRequestSourceBranchUpdated Event
// - pullRequestStatusChanged Event
interface PullRequestDetailEvent extends OriginalEventBase {
  detail: {
    author: string;
    callerUserArn: string;
    creationDate: string;
    description: string;
    destinationCommit: string;
    destinationReference: string;
    event: string;
    isMerged: string;
    lastModifiedDate: string;
    notificationBody: string;
    pullRequestId: string;
    pullRequestStatus: string;
    repositoryNames: string[];
    revisionId: string;
    sourceCommit: string;
    sourceReference: string;
    title: string;
  };
}

// Interface for the following events
// - pullRequestMergeStatusUpdated Event
interface PullRequestMergeStatusUpdatedDetailEvent extends OriginalEventBase {
  detail: {
    author: string;
    callerUserArn: string;
    creationDate: string;
    description: string;
    destinationCommit: string;
    destinationReference: string;
    event: string;
    isMerged: string;
    lastModifiedDate: string;
    mergeOption: string;
    notificationBody: string;
    pullRequestId: string;
    pullRequestStatus: string;
    repositoryNames: string[];
    revisionId: string;
    sourceCommit: string;
    sourceReference: string;
    title: string;
  };
}

// Interface for the following events
// - pullRequestApprovalStateChanged Event
interface PullRequestApprovalStateChangedDetailEvent extends OriginalEventBase {
  detail: {
    approvalStatus: string;
    author: string;
    callerUserArn: string;
    creationDate: string;
    description: string;
    destinationCommit: string;
    destinationReference: string;
    event: string;
    isMerged: string;
    lastModifiedDate: string;
    notificationBody: string;
    pullRequestId: string;
    pullRequestStatus: string;
    repositoryNames: string[];
    revisionId: string;
    sourceCommit: string;
    sourceReference: string;
    title: string;
  };
}

interface HandlerParameters {
  originalEvent:
    | CommentOnPullRequestCreatedDetailEvent
    | CommentOnPullRequestUpdatedDetailEvent
    | PullRequestDetailEvent
    | PullRequestMergeStatusUpdatedDetailEvent
    | PullRequestApprovalStateChangedDetailEvent;
  noticeTargets: { [key: string]: string[] }[];
}

interface Context {
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

const getTitleMessageByEvent = (event: HandlerParameters): string => {
  // The name of the repository where the event occurred
  const repositoryName =
    "repositoryNames" in event.originalEvent.detail
      ? event.originalEvent.detail.repositoryNames.toString()
      : event.originalEvent.detail.repositoryName
      ? event.originalEvent.detail.repositoryName
      : "undefined";

  switch (event.originalEvent.detail.event) {
    case "commentOnPullRequestCreated":
      return `The pull request in the ${repositoryName} repository has been commented`;

    case "commentOnPullRequestUpdated":
      return `The ${repositoryName} repository pull request comments has been updated`;

    case "pullRequestCreated":
      return `The pull request has been created in the ${repositoryName} repository`;

    case "pullRequestSourceBranchUpdated":
      return `The source branch of the pull request in the ${repositoryName} repository has been updated`;

    case "pullRequestStatusChanged":
      return `The status of the ${repositoryName} repository pull request has changed`;

    case "pullRequestMergeStatusUpdated":
      return `The merge status of the ${repositoryName} repository pull request has changed`;

    case "pullRequestApprovalStateChanged":
      return `The approval status of the ${repositoryName} repository pull request has changed`;

    default:
      return "";
  }
};

const buildHeaderSection = (event: HandlerParameters): Header => {
  return {
    type: "header",
    block_id: "header",
    text: {
      type: "plain_text",
      text: getTitleMessageByEvent(event),
    },
  };
};

const buildFieldsSection = async (
  event: HandlerParameters,
  context: Context
): Promise<Section> => {
  const codeCommitClient = new CodeCommitClient({ region: context.region });

  const getPullRequestCommandOutput = await codeCommitClient.send(
    new GetPullRequestCommand({
      pullRequestId: event.originalEvent.detail.pullRequestId,
    })
  );

  // Event notification body
  const notificationBody = event.originalEvent.detail.notificationBody;

  // ARN of the user who triggered this event
  const callerUserArn = event.originalEvent.detail.callerUserArn;

  // Whether the pull request has been merged or not
  const isMerged =
    getPullRequestCommandOutput.pullRequest?.pullRequestTargets?.find(
      (pullRequestTarget) => pullRequestTarget.mergeMetadata
    )?.mergeMetadata?.isMerged;

  // Target branch for PullRequest
  const destinationReference =
    getPullRequestCommandOutput.pullRequest?.pullRequestTargets?.find(
      (pullRequestTarget) => pullRequestTarget.destinationReference
    )?.destinationReference;

  // Source branch for PullRequest
  const sourceReference =
    getPullRequestCommandOutput.pullRequest?.pullRequestTargets?.find(
      (pullRequestTarget) => pullRequestTarget.sourceReference
    )?.sourceReference;

  // AWS Management Console URL
  const consoleUrl = notificationBody.substring(
    notificationBody.indexOf("https://")
  );

  const fields = [
    {
      type: "mrkdwn",
      text: `*AWS Management Console URL:*\n${consoleUrl}`,
    },
    {
      type: "mrkdwn",
      text: `*Caller User ARN:*\n${callerUserArn}`,
    },
    {
      type: "mrkdwn",
      text: `*Pull Request ID:*\n${getPullRequestCommandOutput.pullRequest?.pullRequestId}`,
    },
    {
      type: "mrkdwn",
      text: `*Pull Request Title:*\n${getPullRequestCommandOutput.pullRequest?.title?.substring(
        0,
        characterLimit - 1
      )}`,
    },
    {
      type: "mrkdwn",
      text: `*Pull Request Status:*\n${getPullRequestCommandOutput.pullRequest?.pullRequestStatus}`,
    },
    {
      type: "mrkdwn",
      text: `*isMerged Status:*\n${isMerged}`,
    },
    {
      type: "mrkdwn",
      text: `*Destination Reference:*\n${destinationReference?.substring(
        0,
        characterLimit - 1
      )}`,
    },
    {
      type: "mrkdwn",
      text: `*Source Reference:*\n${sourceReference?.substring(
        0,
        characterLimit - 1
      )}`,
    },
  ];

  // If the event is about comments
  if ("commentId" in event.originalEvent.detail) {
    const getCommentsForPullRequestCommandOutput = await codeCommitClient.send(
      new GetCommentsForPullRequestCommand({
        pullRequestId: event.originalEvent.detail.pullRequestId,
      })
    );

    // Get the name of the file commented on
    fields.push({
      type: "mrkdwn",
      text: `*File Name:*\n${getCommentsForPullRequestCommandOutput.commentsForPullRequestData
        ?.find((pullRequest) =>
          pullRequest.comments?.find(
            (comment) =>
              "commentId" in event.originalEvent.detail &&
              comment.commentId === event.originalEvent.detail.commentId
          )
        )
        ?.location?.filePath?.substring(0, characterLimit - 1)}`,
    });

    // Get comment
    fields.push({
      type: "mrkdwn",
      text: `*Comment:*\n${getCommentsForPullRequestCommandOutput.commentsForPullRequestData
        ?.find((pullRequest) =>
          pullRequest.comments?.find(
            (comment) =>
              "commentId" in event.originalEvent.detail &&
              comment.commentId === event.originalEvent.detail.commentId
          )
        )
        ?.comments?.find(
          (comment) =>
            "commentId" in event.originalEvent.detail &&
            comment.commentId === event.originalEvent.detail.commentId
        )
        ?.content?.substring(0, characterLimit - 1)}`,
    });
  }

  // Approval status of the Pull Request
  if ("approvalStatus" in event.originalEvent.detail) {
    fields.push({
      type: "mrkdwn",
      text: `*Approval Status:*\n${event.originalEvent.detail.approvalStatus}`,
    });
  }

  return {
    type: "section",
    block_id: "fieldsSection",
    fields,
  };
};

const buildTextSection = (event: HandlerParameters): Section => {
  // Event notification body
  const notificationBody = event.originalEvent.detail.notificationBody;

  return {
    type: "section",
    block_id: "textSection",
    text: {
      type: "mrkdwn",
      text: `\`\`\`${notificationBody.substring(0, characterLimit - 1)}\`\`\``,
    },
  };
};

// Number of characters limit for slack
// Ref: https://api.slack.com/reference/block-kit/blocks#section_fields
const characterLimit = 2000;

export const handler = async (
  event: HandlerParameters
): Promise<void | Error> => {
  console.log(`event : ${JSON.stringify(event, null, 2)}`);

  const context = {
    region: getParametersFromEnvVar("REGION", "us-east-1"),
  };

  const codeCommitClient = new CodeCommitClient({ region: context.region });

  const getPullRequestCommandOutput = await codeCommitClient.send(
    new GetPullRequestCommand({
      pullRequestId: event.originalEvent.detail.pullRequestId,
    })
  );

  // Target branch for PullRequest
  const destinationReference =
    getPullRequestCommandOutput.pullRequest?.pullRequestTargets?.find(
      (pullRequestTarget) => pullRequestTarget.destinationReference
    )?.destinationReference;

  // Define Slack message
  const header = buildHeaderSection(event);
  const fields = await buildFieldsSection(event, context);
  const text = buildTextSection(event);
  const slackMessage: SlackMessage = {
    blocks: [
      header,
      {
        type: "divider",
      },
      fields,
      text,
    ],
  };
  console.log(`slackMessage : ${JSON.stringify(slackMessage, null, 2)}`);

  // Send a message to the specified Slack webhook URL from the information of the target branch of the pull request
  for (const [key, slackWebhookUrls] of Object.entries(
    event.noticeTargets.find(
      (noticeTarget) => destinationReference! in noticeTarget
    )!
  )) {
    await Promise.all(
      slackWebhookUrls.map((slackWebhookUrl) =>
        postSlackMessage(slackWebhookUrl, slackMessage)
      )
    );
  }
  return;
};
