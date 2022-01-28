#!/bin/bash

# -x to display the command to be executed
set -x

BUCKET_NAME="$1"
SAM_FILE_NAME="$2"
STACK_NAME="$3"
STATE_MACHINE_NAME="$4"
STACK_ID_AFTER_STACK_NAME="$5"

echo CRON : "'$CRON'"
echo EVENT_PATTERN : "'$EVENT_PATTERN'"
echo EVENT_BUS_ARN : "'$EVENT_BUS_ARN'"
echo TARGET_EVENT_BUS_ARN_AFTER_EXECUTION : "'$TARGET_EVENT_BUS_ARN_AFTER_EXECUTION'"
echo XRAY_TRACING : "'$XRAY_TRACING'"
echo IAM_POLICY_DOCUMENT : $IAM_POLICY_DOCUMENT
echo TAGS_LIST : "'$TAGS_LIST'"

cd sam-sfn

ls -l ./statemachine/StateMachineWorkFlow.asl.json

if [ -s ./statemachine/StateMachineWorkFlow.asl.json ]; then
  sam build \
    --template-file $SAM_FILE_NAME

  sam package \
    --template-file $SAM_FILE_NAME \
    --s3-bucket $BUCKET_NAME \
    --s3-prefix $STACK_NAME-p/ \
    --output-template-file output.yml
  
  if [ -n "$TAGS_LIST" ]; then
    sam deploy \
      --template-file output.yml \
      --s3-bucket $BUCKET_NAME \
      --s3-prefix $STACK_NAME-p/ \
      --stack-name $STATE_MACHINE_NAME \
      --capabilities CAPABILITY_IAM \
      --no-fail-on-empty-changeset \
      --parameter-overrides \
        StateMachineName=$STATE_MACHINE_NAME \
        StackIdAfterStackName=$STACK_ID_AFTER_STACK_NAME \
        Cron="'$CRON'" \
        EventPattern="'$EVENT_PATTERN'" \
        EventBusArn="'$EVENT_BUS_ARN'" \
        TargetEventBusArnAfterExecution="'$TARGET_EVENT_BUS_ARN_AFTER_EXECUTION'" \
        XRayTracing="'$XRAY_TRACING'" \
        IamPolicyDocument="'$IAM_POLICY_DOCUMENT'" \
      --tags "'$TAGS_LIST'"
  else
    sam deploy \
      --template-file output.yml \
      --s3-bucket $BUCKET_NAME \
      --s3-prefix $STACK_NAME-p/ \
      --stack-name $STATE_MACHINE_NAME \
      --capabilities CAPABILITY_IAM \
      --no-fail-on-empty-changeset \
      --parameter-overrides \
        StateMachineName=$STATE_MACHINE_NAME \
        StackIdAfterStackName=$STACK_ID_AFTER_STACK_NAME \
        Cron="'$CRON'" \
        EventPattern="'$EVENT_PATTERN'" \
        EventBusArn="'$EVENT_BUS_ARN'" \
        TargetEventBusArnAfterExecution="'$TARGET_EVENT_BUS_ARN_AFTER_EXECUTION'" \
        XRayTracing="'$XRAY_TRACING'" \
        IamPolicyDocument="'$IAM_POLICY_DOCUMENT'"
  fi
  aws cloudformation describe-stacks --stack-name $STATE_MACHINE_NAME
else
  # If the ASL file is empty, delete the stack
  yes | \
  sam delete \
    --stack-name $STATE_MACHINE_NAME
fi
