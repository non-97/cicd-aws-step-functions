#!/bin/bash

# -x to display the command to be executed
set -x

bucket_name="$1"
sfn_template_bucket_sam_template_key="$2"


STATE_MACHINE_IAM_ROLE=`yq -r '.Settings.iam_role_arn' StateMachineSettings.yml`
echo STATE_MACHINE_IAM_ROLE : $STATE_MACHINE_IAM_ROLE

CRON=`yq -r '.Settings.cron' StateMachineSettings.yml`
echo CRON : "'$CRON'"

EVENT_PATTERN=`yq -r '.Settings.event_pattern' StateMachineSettings.yml`
echo EVENT_PATTERN : "'EVENT_PATTERN'"

TARGET_EVENT_BUS_ARN_AFTER_EXECUTION=`yq -r '.Settings.target_event_bus_arn_after_execution' StateMachineSettings.yml`
echo TARGET_EVENT_BUS_ARN_AFTER_EXECUTION : "'TARGET_EVENT_BUS_ARN_AFTER_EXECUTION'"

# Download the AWS SAM template file from the S3 bucket
aws s3 cp s3://$bucket_name/$sfn_template_bucket_sam_template_key $sfn_template_bucket_sam_template_key

cat StateMachineWorkFlow.asl.json

# Move the necessary files to the AWS SAM directory
mkdir -p sam-sfn/statemachine
cp -p StateMachineWorkFlow.asl.json ./sam-sfn/statemachine/StateMachineWorkFlow.asl.json
cp -p $sfn_template_bucket_sam_template_key ./sam-sfn/$sfn_template_bucket_sam_template_key
