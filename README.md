# AWS Step Functions CI/CD Project

Manage the CI/CD environment for AWS Step Functions using AWS CDK.

## Usage

```bash
npm install

# Enter the AWS account and the Webhook URL to be used for notifications in .env.
#
# Example
#
# JUMP_ACCOUNT=12345678901x
# 
# APP_TEAM_WEBHOOK_URL=https:#hooks.slack.com/services/xxx
# APP_TEAM_MANAGER_WEBHOOK_URL=https:#hooks.slack.com/services/yyy
# INFRA_TEAM_WEBHOOK_URL=https:#hooks.slack.com/services/zzz
# 
# SOURCE_ACCOUNTS=["12345678901y","12345678901z"]
vi .env

npx cdk deploy --all
```

## Directory

```bash
.
├── .env  # dotenv file
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
│   ├── sfn-template-bucket-stack.ts              # Stack of S3 buckets to store AWS Step Function template files and CodeBuild shell scripts
│   └── workflow-support-function-stack.ts        # Stack of Lambda functions to support the creation of AWS Step Functions workflows
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
│   │   │   └── StateMachineWorkFlow.asl.js
│   │   └── git-template.zip
│   ├── ec2
│   │   └── userDataAmazonLinux2.sh
│   └── lambda
│       └── functions
│           ├── calculate-waiting-time-for-target-time.ts   # Lambda function to calculate the waiting time until a specified time
│           ├── notice-codebuild-events.ts                  # Lambda function for event notification of CodeBuild
│           ├── notice-execute-state-machine-events.ts      # Lambda function for event notification of Execute StateMachine
│           ├── notice-pull-request-events.ts               # Lambda function for event notification of pull requests
│           └── same-day-execution-history-check.ts         # Lambda function to check if a StateMachine was executed on the same day
├── test
│   └── cicd-aws-step-functions.test.ts
└── tsconfig.json
```
