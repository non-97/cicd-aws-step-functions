#!/bin/bash

# -x to display the command to be executed
set -x

bucket_name="$1"
sfn_template_bucket_sam_template_key="$2"


STATE_MACHINE_IAM_ROLE=`yq -r '.Settings.iam_role_arn' SFnStateMachineSettings.yml`
echo STATE_MACHINE_IAM_ROLE : $STATE_MACHINE_IAM_ROLE

CRON=`yq -r '.Settings.cron' SFnStateMachineSettings.yml`
echo CRON : "'$CRON'"

EVENT_PATTERN=`yq -r '.Settings.event_pattern' SFnStateMachineSettings.yml`
echo EVENT_PATTERN : "'EVENT_PATTERN'"

TARGET_EVENT_BUS_ARN_AFTER_EXECUTION=`yq -r '.Settings.target_event_bus_arn_after_execution' SFnStateMachineSettings.yml`
echo TARGET_EVENT_BUS_ARN_AFTER_EXECUTION : "'TARGET_EVENT_BUS_ARN_AFTER_EXECUTION'"

aws s3 cp s3://$bucket_name/$sfn_template_bucket_sam_template_key $sfn_template_bucket_sam_template_key

cat SFnStateWorkFlow.asl.json

mkdir -p sam-sfn/statemachine
cp -p SFnStateWorkFlow.asl.json ./sam-sfn/statemachine/SFnStateWorkFlow.asl.json
cp -p $sfn_template_bucket_sam_template_key ./sam-sfn/$sfn_template_bucket_sam_template_key
