# AWS Step Functions CI/CD Project

Manage the CI/CD environment for AWS Step Functions using AWS CDK.

## Usage

```bash
git clone https://github.com/non-97/cicd-aws-step-functions.git

cd cicd-aws-step-functions

npm install

# Enter various setting values in .env.
# 
# Example
#
# AWS account where CodeBuild resides
# DEPLOYMENT_CONTROL_ACCOUNT=12345678901a
#
# # AWS account where State Machine, EventBridge Rule, etc. are created using AWS SAM from CodeBuild
# DEPLOYMENT_DESTINATION_ACCOUNTS=" 
#   12345678901a,
#   12345678901b,
#   12345678901c
# "
#
# # AWS accounts that are allowed to send events by EventBridge Bus
# EVENTS_SOURCE_ACCOUNTS=" 
#   12345678901a,
#   12345678901b,
#   12345678901c
# "
#
# # ARNs of IAM User that can switch role to IAM Role for app team
# APP_TEAM_IAM_USER_ARN=" 
#   arn:aws:iam::12345678901x:user/app-team-a,
#   arn:aws:iam::12345678901x:user/app-team-b,
#   arn:aws:iam::12345678901x:user/app-team-c
# "
#
# # ARNs of the IAM User that can switch role to the IAM Role for the manager of the app team
# APP_TEAM_MANAGER_IAM_USER_ARN=" 
#   arn:aws:iam::12345678901x:user/app-team-manager-a,
#   arn:aws:iam::12345678901x:user/app-team-manager-b,
# "
#
# # ARNs of IAM User that can switch role to IAM Role for infrastructure team
# INFRA_TEAM_IAM_USER_ARN=" 
#   arn:aws:iam::12345678901x:user/infra-team-a,
#   arn:aws:iam::12345678901x:user/infra-team-b
# "
#
# # Webhook URL to notify the Slack channel
# APP_TEAM_WEBHOOK_URL=https://hooks.slack.com/services/xxxx
# APP_TEAM_MANAGER_WEBHOOK_URL=https://hooks.slack.com/services/yyyy
# INFRA_TEAM_WEBHOOK_URL=https://hooks.slack.com/services/zzzz
#
# # State Machine
# # Used to manage stack of CI/CD pipelines for State Machine
# STATE_MACHINES="[
#   {
#     "STATE_MACHINE_NAMES":"StateMachineTest001",
#     "ADD_PIPELINE_FOR_DEVELOP_BRANCH":false
#   },
#   {
#     "STATE_MACHINE_NAMES":"StateMachineTest002",
#     "ADD_PIPELINE_FOR_DEVELOP_BRANCH":true
#   }
# ]"
vi .env

npx cdk bootstrap

npx cdk deploy --all
```

## Directory

```bash
.
├── .env
├── .env_example
├── .gitignore
├── .npmignore
├── README.md
├── bin
│   └── cicd-aws-step-functions.ts
├── cdk.json
├── jest.config.js
├── lib
│   ├── artifact-bucket-stack.ts                  # Stack of S3 buckets for CodeBuild artifacts
│   ├── cicd-stack.ts                             # Stack for CI/CD of AWS Step Functions
│   ├── ec2-instances-stack.ts                    # Stack of EC2 instances used in the demo
│   ├── event-bus-stack.ts                        # Stack of EventBus to accept events from other accounts
│   ├── notice-sfn-cicd-events-function-stack.ts  # Stack of Lambda functions to notify events of AWS Step Functions CI/CD
│   ├── role-stack.ts                             # Stack of IAM roles and CodeCommit approval rule templates for each role
│   ├── sam-deploy-role-stack.ts                  # Stack of IAM roles for deploying various resources using AWS SAM to another account
│   ├── sfn-template-bucket-stack.ts              # Stack of S3 buckets to store AWS Step Function template files and CodeBuild shell scripts
│   └── workflow-support-function-stack.ts        # Stack of Lambda functions to support the creation of AWS Step Functions workflows
├── out
├── package-lock.json
├── package.json
├── src
│   ├── cloudWatch
│   │   └── AmazonCloudWatch-linux.json
│   ├── codeBuild
│   │   ├── buildCommand.sh
│   │   ├── preBuildCommand.sh
│   │   └── sam-template.yml
│   ├── codeCommit
│   │   ├── git-template
│   │   │   ├── README.md
│   │   │   ├── StateMachineSettings.yml
│   │   │   └── StateMachineWorkFlow.asl.json
│   │   ├── git-template_StateMachineTest001.zip
│   │   └── git-template_StateMachineTest002.zip
│   ├── ec2
│   │   └── userDataAmazonLinux2.sh
│   └── lambda
│       └── functions
│           ├── calculate-waiting-time-for-target-time.ts   # Lambda function to calculate the waiting time until a specified time
│           ├── event-bridge.ts                             # The base Interface for EventBridge event patterns.
│           ├── notice-codebuild-events.ts                  # Lambda function for event notification of CodeBuild
│           ├── notice-execute-state-machine-events.ts      # Lambda function for event notification of Execute StateMachine
│           ├── notice-pull-request-events.ts               # Lambda function for event notification of pull requests
│           ├── same-day-execution-history-check.ts         # Lambda function to check if a StateMachine was executed on the same day
│           └── slack.ts                                    # Functions and Interface for posting messages to Slack
├── test
│   └── cicd-aws-step-functions.test.ts
└── tsconfig.json

```

## Detailed Description

- [AWS CDKでAWS Step FunctionsのCI/CD環境を作ってみた](https://dev.classmethod.jp/articles/cicd-of-aws-step-functions-with-aws-cdk/)
- [[AWS Step Functions] 1日1回までしか処理をしないようにステートマシンを制御してみた](https://dev.classmethod.jp/articles/control-the-state-machine-to-run-only-once-a-day/)
- [[AWS Step Functions] タスクの開始時刻を制御してみた](https://dev.classmethod.jp/articles/aws-step-functions-control-start-time-of-task/)
- [[AWS CDK] APIを呼び出すだけのカスタムリソースならLambda関数は不要な件](https://dev.classmethod.jp/articles/create-custom-resources-with-aws-cdk-without-using-lambda-functions/)
- [CodeCommitのPull Request関連のイベントをSlackに通知してみた](https://dev.classmethod.jp/articles/notify-slack-of-events-related-to-codecommit-pull-requests/)
