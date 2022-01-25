// import * as cr from '@aws-cdk/custom-resources';

import { Construct } from "constructs";
import {
  Fn,
  Stack,
  StackProps,
  aws_s3 as s3,
  aws_logs as logs,
  aws_iam as iam,
  aws_codecommit as codecommit,
  aws_codebuild as codebuild,
  aws_codepipeline as codepipeline,
  aws_codepipeline_actions as codepipeline_actions,
  aws_events as events,
  aws_events_targets as targets,
  aws_lambda_nodejs as nodejs,
  custom_resources as cr,
  RemovalPolicy,
} from "aws-cdk-lib";
import * as path from "path";
interface CicdStackProps extends StackProps {
  stateMachineName: string;
  artifactBucket: s3.IBucket;
  sfnTemplateBucket: s3.IBucket;
  gitTemplateFileName: string;
  samTemplateFileName: string;
  appTeamWebhookUrl: string;
  appTeamManagerWebhookUrl: string;
  infraTeamWebhookUrl: string;
  mainBranchApprovalRuleTemplate: cr.AwsCustomResource;
  developBranchApprovalRuleTemplate: cr.AwsCustomResource;
  noticePullRequestEventsFunction: nodejs.NodejsFunction;
  noticeCodeBuildEventsFunction: nodejs.NodejsFunction;
  noticeExecuteStateMachineEventsFunction: nodejs.NodejsFunction;
}

export class CicdStack extends Stack {
  constructor(scope: Construct, id: string, props: CicdStackProps) {
    super(scope, id, props);

    // Get the string after the stack name in the stack id to append to the end of the Log Group name to make it unique
    const stackIdAfterStackName = Fn.select(2, Fn.split("/", this.stackId));

    // CloudWatch Logs for CodeBuild Logs
    const codeBuildLogGroup = new logs.LogGroup(this, "CodeBuildLogGroup", {
      logGroupName: `/aws/vendedlogs/codebuild/${props.stateMachineName}-${stackIdAfterStackName}-Logs`,
      retention: logs.RetentionDays.TWO_WEEKS,
    });

    // CodeCommit repository
    // Upload files stored in an S3 bucket
    const repository = new codecommit.Repository(this, "Repository", {
      repositoryName: props.stateMachineName,
      code: codecommit.Code.fromZipFile(
        `./src/codeCommit/${props.gitTemplateFileName}`,
        "main"
      ),
    });
    repository.applyRemovalPolicy(RemovalPolicy.RETAIN);

    // CodeBuild　project
    // Deploy a StateMachine with AWS SAM
    const project = new codebuild.PipelineProject(this, "project", {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            commands: [
              "yum install -y jq git",
              "pip3 install yq",
              "curl -OL https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip ",
              "unzip aws-sam-cli-linux-x86_64.zip -d sam-installation",
              "./sam-installation/install",
              "sam --version",
            ],
          },
          pre_build: {
            commands: [
              `aws s3 cp s3://${props.sfnTemplateBucket.bucketName}/preBuildCommand.sh .`,
              `source ./preBuildCommand.sh ${props.sfnTemplateBucket.bucketName} ${props.samTemplateFileName}`,
            ],
          },
          build: {
            commands: [
              `aws s3 cp s3://${props.sfnTemplateBucket.bucketName}/buildCommand.sh .`,
              `source ./buildCommand.sh ${props.artifactBucket.bucketName} ${props.samTemplateFileName} ${this.stackName} ${props.stateMachineName} ${stackIdAfterStackName}`,
            ],
          },
          post_build: {
            commands: ["echo Build completed on `date`"],
          },
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
      },
      logging: {
        cloudWatch: {
          enabled: true,
          logGroup: codeBuildLogGroup,
        },
      },
    });

    // Add the policies required to deploy StateMachine in AWS SAM
    project.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:aws:states:${this.region}:${this.account}:stateMachine:*`,
        ],
        actions: [
          "states:CreateStateMachine",
          "states:DeleteStateMachine",
          "states:DescribeStateMachine",
          "states:UpdateStateMachine",
          "states:TagResource",
        ],
      })
    );
    project.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:iam::${this.account}:role/*`],
        actions: [
          "iam:AttachRolePolicy",
          "iam:CreateRole",
          "iam:CreatePolicy",
          "iam:DeleteRole",
          "iam:DeleteRolePolicy",
          "iam:DetachRolePolicy",
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:PassRole",
          "iam:PutRolePolicy",
          "iam:TagRole",
        ],
      })
    );
    project.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:states:${this.region}:${this.account}:key/*`],
        actions: ["kms:Decrypt", "kms:GenerateDataKey"],
      })
    );
    project.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:*`],
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DeleteLogGroup",
          "logs:DescribeLogGroups",
          "logs:ListTagsLogGroup",
        ],
      })
    );
    project.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:aws:cloudformation:${this.region}:${this.account}:stack/*`,
        ],
        actions: [
          "cloudformation:CreateChangeSet",
          "cloudformation:CreateStack",
          "cloudformation:DeleteStack",
          "cloudformation:DescribeChangeSet",
          "cloudformation:DescribeStackEvents",
          "cloudformation:DescribeStacks",
          "cloudformation:ExecuteChangeSet",
          "cloudformation:GetTemplate",
          "cloudformation:GetTemplateSummary",
          "cloudformation:ListStackResources",
          "cloudformation:UpdateStack",
        ],
      })
    );
    project.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:events:${this.region}:${this.account}:rule/*`],
        actions: [
          "events:DeleteRule",
          "events:DescribeRule",
          "events:PutTargets",
          "events:PutRule",
          "events:RemoveTargets",
        ],
      })
    );
    project.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject*", "s3:GetBucket*", "s3:List*", "s3:PutObject"],
        resources: [
          `${props.sfnTemplateBucket.bucketArn}`,
          `${props.sfnTemplateBucket.bucketArn}/*`,
        ],
      })
    );
    project.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [
          "arn:aws:cloudformation:*:aws:transform/Serverless-2016-10-31",
        ],
        actions: ["cloudformation:CreateChangeSet"],
      })
    );

    // CodePipeline Artifacts
    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    // If there are any changes to the main branch
    const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: "CodeCommit",
      repository: repository,
      branch: "main",
      output: sourceOutput,
    });

    // Deploy a StateMachine with AWS SAM
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "CodeBuild",
      project: project,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    // CodePipeline
    const pipeline = new codepipeline.Pipeline(this, "pipeline", {
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
        },
        {
          stageName: "Build",
          actions: [buildAction],
        },
      ],
      artifactBucket: props.artifactBucket,
    });

    // IAM policy for associating repositories with approval rule templates
    const approvalRuleTemplatePolicy =
      cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            "codecommit:AssociateApprovalRuleTemplateWithRepository",
            "codecommit:DisassociateApprovalRuleTemplateFromRepository",
          ],
          resources: ["*"],
        }),
      ]);

    // Associate approval rule templates for repository and main branch
    new cr.AwsCustomResource(
      this,
      "AssociateMainBranchApprovalRuleTemplateWithRepository",
      {
        logRetention: logs.RetentionDays.ONE_WEEK,
        onCreate: {
          action: "associateApprovalRuleTemplateWithRepository",
          parameters: {
            approvalRuleTemplateName:
              props.mainBranchApprovalRuleTemplate.getResponseFieldReference(
                "approvalRuleTemplate.approvalRuleTemplateName"
              ),
            repositoryName: repository.repositoryName,
          },
          physicalResourceId: cr.PhysicalResourceId.of(
            `${props.mainBranchApprovalRuleTemplate.getResponseFieldReference(
              "approvalRuleTemplate.approvalRuleTemplateName"
            )}-${repository.repositoryName}`
          ),
          service: "CodeCommit",
        },
        onDelete: {
          action: "disassociateApprovalRuleTemplateFromRepository",
          parameters: {
            approvalRuleTemplateName:
              props.mainBranchApprovalRuleTemplate.getResponseFieldReference(
                "approvalRuleTemplate.approvalRuleTemplateName"
              ),
            repositoryName: repository.repositoryName,
          },
          service: "CodeCommit",
        },
        policy: approvalRuleTemplatePolicy,
      }
    );

    // Associate approval rule templates for repository and develop branch
    new cr.AwsCustomResource(
      this,
      "AssociateDevelopBranchApprovalRuleTemplateWithRepository",
      {
        logRetention: logs.RetentionDays.ONE_WEEK,
        onCreate: {
          action: "associateApprovalRuleTemplateWithRepository",
          parameters: {
            approvalRuleTemplateName:
              props.developBranchApprovalRuleTemplate.getResponseFieldReference(
                "approvalRuleTemplate.approvalRuleTemplateName"
              ),
            repositoryName: repository.repositoryName,
          },
          physicalResourceId: cr.PhysicalResourceId.of(
            `${props.developBranchApprovalRuleTemplate.getResponseFieldReference(
              "approvalRuleTemplate.approvalRuleTemplateName"
            )}-${repository.repositoryName}`
          ),
          service: "CodeCommit",
        },
        onDelete: {
          action: "disassociateApprovalRuleTemplateFromRepository",
          parameters: {
            approvalRuleTemplateName:
              props.developBranchApprovalRuleTemplate.getResponseFieldReference(
                "approvalRuleTemplate.approvalRuleTemplateName"
              ),
            repositoryName: repository.repositoryName,
          },
          service: "CodeCommit",
        },
        policy: approvalRuleTemplatePolicy,
      }
    );

    // EventBridge Rule for notification of PullRequest events
    new events.Rule(this, "PullRequestEventBriedgeRule", {
      eventPattern: {
        source: ["aws.codecommit"],
        detail: {
          event: [
            "commentOnPullRequestCreated",
            "commentOnPullRequestUpdated",
            "pullRequestCreated",
            "pullRequestSourceBranchUpdated",
            "pullRequestStatusChanged",
            "pullRequestMergeStatusUpdated",
            "pullRequestApprovalStateChanged",
          ],
        },
        resources: [repository.repositoryArn],
      },
      targets: [
        new targets.LambdaFunction(props.noticePullRequestEventsFunction, {
          event: events.RuleTargetInput.fromObject({
            originalEvent: events.EventField.fromPath("$"),
            noticeTargets: [
              {
                "refs/heads/develop": [
                  props.appTeamWebhookUrl,
                  props.appTeamManagerWebhookUrl,
                ],
              },
              {
                "refs/heads/main": [
                  props.appTeamWebhookUrl,
                  props.appTeamManagerWebhookUrl,
                  props.infraTeamWebhookUrl,
                ],
              },
            ],
          }),
        }),
      ],
    });

    // EventBridge Rule for notification of CodeBuildn status changes
    new events.Rule(this, "BuildStatusEventBriedgeRule", {
      eventPattern: {
        source: ["aws.codebuild"],
        detailType: ["CodeBuild Build State Change"],
        detail: {
          "project-name": [project.projectName],
        },
      },
      targets: [
        new targets.LambdaFunction(props.noticeCodeBuildEventsFunction, {
          event: events.RuleTargetInput.fromObject({
            originalEvent: events.EventField.fromPath("$"),
            slackWebhookUrls: [
              props.appTeamWebhookUrl,
              props.appTeamManagerWebhookUrl,
              props.infraTeamWebhookUrl,
            ],
          }),
        }),
      ],
    });

    //　EventBridge Rule for notifying the execution status of Step Functions
    new events.Rule(
      this,
      "ExecutionStatusOfStepFunctionsChangeEventBriedgeRule",
      {
        eventPattern: {
          source: ["aws.states"],
          detailType: ["Step Functions Execution Status Change"],
          detail: {
            stateMachineArn: [
              `arn:aws:states:${this.region}:${this.account}:stateMachine:${props.stateMachineName}`,
            ],
          },
        },
        targets: [
          new targets.LambdaFunction(
            props.noticeExecuteStateMachineEventsFunction,
            {
              event: events.RuleTargetInput.fromObject({
                originalEvent: events.EventField.fromPath("$"),
                slackWebhookUrls: [
                  props.appTeamWebhookUrl,
                  props.appTeamManagerWebhookUrl,
                  props.infraTeamWebhookUrl,
                ],
              }),
            }
          ),
        ],
      }
    );
  }
}
