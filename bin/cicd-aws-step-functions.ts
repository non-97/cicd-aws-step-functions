#!/usr/bin/env node
import "source-map-support/register";
import * as dotenv from "dotenv";
import * as cdk from "aws-cdk-lib";
import { SfnTemplateBucketStack } from "../lib/sfn-template-bucket-stack";
import { ArtifactBucketStack } from "../lib/artifact-bucket-stack";
import { RoleStack } from "../lib/role-stack";
import { SamDeployRoleStack } from "../lib/sam-deploy-role-stack";
import { EventBusStack } from "../lib/event-bus-stack";
import { NoticeSfnCicdEventsFunctionStack } from "../lib/notice-sfn-cicd-events-function-stack";
import { WorkflowSupportFunctionStack } from "../lib/workflow-support-function-stack";
import { CicdStack } from "../lib/cicd-stack";
import { Ec2InstancesStack } from "../lib/ec2-instances-stack";

dotenv.config({ multiline: true });

const app = new cdk.App();

// If the variable specified by dotenv is not defined, the process is aborted
if (
  typeof process.env.APP_TEAM_WEBHOOK_URL == "undefined" ||
  typeof process.env.APP_TEAM_MANAGER_WEBHOOK_URL == "undefined" ||
  typeof process.env.INFRA_TEAM_WEBHOOK_URL == "undefined" ||
  typeof process.env.APP_TEAM_IAM_USER_ARN == "undefined" ||
  typeof process.env.APP_TEAM_MANAGER_IAM_USER_ARN == "undefined" ||
  typeof process.env.INFRA_TEAM_IAM_USER_ARN == "undefined"
) {
  console.error(`
    There is not enough input in the .env file.
    Please enter a value in the .env file.`);
  process.exit(1);
}

// Define a webhook URL in dotenv to notify each channel
const appTeamWebhookUrl = process.env.APP_TEAM_WEBHOOK_URL;
const appTeamManagerWebhookUrl = process.env.APP_TEAM_MANAGER_WEBHOOK_URL;
const infraTeamWebhookUrl = process.env.INFRA_TEAM_WEBHOOK_URL;

// Stack of S3 buckets to store AWS Step Function template files and CodeBuild shell scripts
const sfnTemplateBucketStack = new SfnTemplateBucketStack(
  app,
  "SfnTemplateBucketStack"
);

// Stack of S3 buckets for CodeBuild artifacts
const artifactBucketStack = new ArtifactBucketStack(app, "ArtifactBucketStack");

// Stack of IAM roles and CodeCommit approval rule templates for each role
const roleStack = new RoleStack(app, "RoleStack", {
  appTeamIamUserArns: process.env.APP_TEAM_IAM_USER_ARN.replace(
    /\s+/g,
    ""
  ).split(","),
  appTeamManagerIamUserArns: process.env.APP_TEAM_MANAGER_IAM_USER_ARN.replace(
    /\s+/g,
    ""
  ).split(","),
  infraTeamIamUserArns: process.env.INFRA_TEAM_IAM_USER_ARN.replace(
    /\s+/g,
    ""
  ).split(","),
});

if (typeof process.env.DEPLOYMENT_CONTROL_ACCOUNT != "undefined") {
  const samDeployRoleStack = new SamDeployRoleStack(app, "SamDeployRoleStack", {
    deploymentControlAccount: process.env.DEPLOYMENT_CONTROL_ACCOUNT,
  });
}

// Stack of Event Bus
// It is used for accepting events from other accounts
new EventBusStack(app, "StateMachineEventBusStack", {
  eventBusName: "StateMachineEventBus",
  eventsSourceAccounts: process.env.EVENTS_SOURCE_ACCOUNTS?.replace(
    /\s+/g,
    ""
  ).split(","),
});

// Stack of Lambda functions to notify events of AWS Step Functions CI/CD
const noticeSfnCicdEventsFunctionStack = new NoticeSfnCicdEventsFunctionStack(
  app,
  "NoticeSfnCicdEventsFunctionStack"
);

// Stack of Lambda functions to support the creation of AWS Step Functions workflows
new WorkflowSupportFunctionStack(app, "WorkflowSupportFunctionStack");

// Stack for CI/CD of AWS Step Functions
// To create multiple StateMachine, duplicate this stack
new CicdStack(app, "StateMachineTest001CicdStack", {
  stateMachineName: "StateMachineTest001",
  artifactBucket: artifactBucketStack.artifactBucket,
  sfnTemplateBucket: sfnTemplateBucketStack.sfnTemplateBucket,
  gitTemplateDirectoryPath: "./src/codeCommit/git-template",
  samTemplateFileName: "sam-template.yml",
  deploymentDestinationAccounts:
    process.env.DEPLOYMENT_DESTINATION_ACCOUNTS?.replace(/\s+/g, "").split(","),
  addPipelineForDevelopBranch: false,
  appTeamWebhookUrl: appTeamWebhookUrl,
  appTeamManagerWebhookUrl: appTeamManagerWebhookUrl,
  infraTeamWebhookUrl: infraTeamWebhookUrl,
  mainBranchApprovalRuleTemplate: roleStack.mainBranchApprovalRuleTemplate,
  developBranchApprovalRuleTemplate:
    roleStack.developBranchApprovalRuleTemplate,
  noticePullRequestEventsFunction:
    noticeSfnCicdEventsFunctionStack.noticePullRequestEventsFunction,
  noticeCodeBuildEventsFunction:
    noticeSfnCicdEventsFunctionStack.noticeCodeBuildEventsFunction,
  noticeExecuteStateMachineEventsFunction:
    noticeSfnCicdEventsFunctionStack.noticeExecuteStateMachineEventsFunction,
});

new CicdStack(app, "StateMachineTest002CicdStack", {
  stateMachineName: "StateMachineTest002",
  artifactBucket: artifactBucketStack.artifactBucket,
  sfnTemplateBucket: sfnTemplateBucketStack.sfnTemplateBucket,
  gitTemplateDirectoryPath: "./src/codeCommit/git-template",
  samTemplateFileName: "sam-template.yml",
  deploymentDestinationAccounts:
    process.env.DEPLOYMENT_DESTINATION_ACCOUNTS?.replace(/\s+/g, "").split(","),
  addPipelineForDevelopBranch: true,
  appTeamWebhookUrl: appTeamWebhookUrl,
  appTeamManagerWebhookUrl: appTeamManagerWebhookUrl,
  infraTeamWebhookUrl: infraTeamWebhookUrl,
  mainBranchApprovalRuleTemplate: roleStack.mainBranchApprovalRuleTemplate,
  developBranchApprovalRuleTemplate:
    roleStack.developBranchApprovalRuleTemplate,
  noticePullRequestEventsFunction:
    noticeSfnCicdEventsFunctionStack.noticePullRequestEventsFunction,
  noticeCodeBuildEventsFunction:
    noticeSfnCicdEventsFunctionStack.noticeCodeBuildEventsFunction,
  noticeExecuteStateMachineEventsFunction:
    noticeSfnCicdEventsFunctionStack.noticeExecuteStateMachineEventsFunction,
});

// EC2 instances are used to hit the EC2 API in the state machine
// Not used in production operations
new Ec2InstancesStack(app, "DemoEc2InstancesStack");
