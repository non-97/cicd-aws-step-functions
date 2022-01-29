#!/bin/bash

# -x to display the command to be executed
set -x

BUCKET_NAME="$1"
SAM_FILE_NAME="$2"

DEPLOYMENT_DESTINATION_ACCOUNT_IAM_ROLE_ARN=`yq -r ".Settings.deployment_destination_account_iam_role_arn" StateMachineSettings.yml`
echo DEPLOYMENT_DESTINATION_ACCOUNT_IAM_ROLE_ARN : $DEPLOYMENT_DESTINATION_ACCOUNT_IAM_ROLE_ARN

CRON=`yq -r ".Settings.cron" StateMachineSettings.yml`
echo CRON : "'$CRON'"

EVENT_PATTERN=`yq -r ".Settings.event_pattern" StateMachineSettings.yml`
echo EVENT_PATTERN : $EVENT_PATTERN

EVENT_BUS_ARN=`yq -r ".Settings.event_bus_arn" StateMachineSettings.yml`
echo EVENT_BUS_ARN : $EVENT_BUS_ARN

TARGET_EVENT_BUS_ARN_AFTER_EXECUTION=`yq -r ".Settings.target_event_bus_arn_after_execution" StateMachineSettings.yml`
echo TARGET_EVENT_BUS_ARN_AFTER_EXECUTION : $TARGET_EVENT_BUS_ARN_AFTER_EXECUTION

XRAY_TRACING=`yq -r ".Settings.xray_tracing" StateMachineSettings.yml`
echo XRAY_TRACING : $XRAY_TRACING

IAM_POLICY_DOCUMENT=`yq -r ".Settings.iam_policy_document" StateMachineSettings.yml`
echo IAM_POLICY_DOCUMENT : $IAM_POLICY_DOCUMENT

TAGS_LENGTH=`yq -r ".Settings.tags[].Key" StateMachineSettings.yml | wc -l`
echo TAGS_LENGTH : $TAGS_LENGTH

for i in `seq 0 $((${TAGS_LENGTH} - 1))`; do
  KEY=`yq -r ".Settings.tags[${i}].Key" StateMachineSettings.yml`
  VALUE=`yq -r ".Settings.tags[${i}].Value" StateMachineSettings.yml`
  TAGS_LIST+=`echo "'$KEY'"="'$VALUE' "`
done
echo TAGS_LIST : $TAGS_LIST

# Download the AWS SAM template file from the S3 bucket
aws s3 cp s3://$BUCKET_NAME/$SAM_FILE_NAME $SAM_FILE_NAME

cat StateMachineWorkFlow.asl.json

# Move the necessary files to the AWS SAM directory
mkdir -p sam-sfn/state_machine
cp -p StateMachineWorkFlow.asl.json ./sam-sfn/state_machine/StateMachineWorkFlow.asl.json
cp -p $SAM_FILE_NAME ./sam-sfn/$SAM_FILE_NAME
