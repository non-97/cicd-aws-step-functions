#!/bin/bash

# -x to display the command to be executed
set -x

BUCKET_NAME="$1"
SAM_FILE_NAME="$2"
REPOSITORY_PATH="$3"

DEPLOYMENT_DESTINATION_ACCOUNT_IAM_ROLE_ARN=`yq -r ".Settings.deployment_destination_account_iam_role_arn" ${REPOSITORY_PATH}StateMachineSettings.yml`
echo DEPLOYMENT_DESTINATION_ACCOUNT_IAM_ROLE_ARN : $DEPLOYMENT_DESTINATION_ACCOUNT_IAM_ROLE_ARN

i=0
IFS=$'\n'; for CRON in $(yq -rc ".Settings.event_bridge_rule[].cron? | select(.!=null)" ${REPOSITORY_PATH}StateMachineSettings.yml); do
  CRON_ARRAY[$((i++))]=`echo $CRON`
done
echo "${CRON_ARRAY[@]}"

i=0
IFS=$'\n'; for EVENT_PATTERN in $(yq -rc ".Settings.event_bridge_rule[].event_pattern? | select(.!=null)" ${REPOSITORY_PATH}StateMachineSettings.yml); do
  EVENT_PATTERN_ARRAY[$((i++))]=`echo $EVENT_PATTERN`
done
echo "${EVENT_PATTERN_ARRAY[@]}"

i=0
IFS=$'\n'; for EVENT_BUS_ARN in $(yq -rc ".Settings.event_bridge_rule[].event_bus_arn? | select(.!=null)" ${REPOSITORY_PATH}StateMachineSettings.yml); do
  EVENT_BUS_ARN_ARRAY[$((i++))]=`echo $EVENT_BUS_ARN`
done
echo "${EVENT_BUS_ARN_ARRAY[@]}"

TARGET_EVENT_BUS_ARN_AFTER_EXECUTION=`yq -r ".Settings.target_event_bus_arn_after_execution" ${REPOSITORY_PATH}StateMachineSettings.yml`
echo TARGET_EVENT_BUS_ARN_AFTER_EXECUTION : $TARGET_EVENT_BUS_ARN_AFTER_EXECUTION

XRAY_TRACING=`yq -r ".Settings.xray_tracing" ${REPOSITORY_PATH}StateMachineSettings.yml`
echo XRAY_TRACING : $XRAY_TRACING

IAM_POLICY_DOCUMENT=`yq -r ".Settings.iam_policy_document" ${REPOSITORY_PATH}StateMachineSettings.yml`
echo IAM_POLICY_DOCUMENT : $IAM_POLICY_DOCUMENT

IFS=$'\n'; for TAG in $(yq -rc ".Settings.tags[]" ${REPOSITORY_PATH}StateMachineSettings.yml); do
  KEY=`echo $TAG | jq -r .Key`
  VALUE=`echo $TAG | jq -r .Value`
  TAGS_LIST+=`echo "'$KEY'"="'$VALUE' "`
done
echo TAGS_LIST : $TAGS_LIST

# Download the AWS SAM template file from the S3 bucket
aws s3 cp s3://$BUCKET_NAME/$SAM_FILE_NAME $SAM_FILE_NAME

cat StateMachineWorkFlow.asl.json

# Move the necessary files to the AWS SAM directory
mkdir -p sam-sfn/state_machine

cp -p ${REPOSITORY_PATH}StateMachineWorkFlow.asl.json ./sam-sfn/state_machine/StateMachineWorkFlow.asl.json
cp -p $SAM_FILE_NAME ./sam-sfn/$SAM_FILE_NAME

_CRON_ARRAY=$(IFS=';'; echo "${CRON_ARRAY[*]}")
_EVENT_PATTERN_ARRAY=$(IFS=';'; echo "${EVENT_PATTERN_ARRAY[*]}")
_EVENT_BUS_ARN_ARRAY=$(IFS=';'; echo "${EVENT_BUS_ARN_ARRAY[*]}")