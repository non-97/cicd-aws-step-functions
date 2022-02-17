#!/bin/bash

# -x to display the command to be executed
set -x

BUCKET_NAME="$1"
SAM_FILE_NAME="$2"
STATE_MACHINE_NAME="$3"
STACK_UNIQUE_ID="$4"

echo DEPLOYMENT_DESTINATION_ACCOUNT_IAM_ROLE_ARN : $DEPLOYMENT_DESTINATION_ACCOUNT_IAM_ROLE_ARN

IFS=';'; CRON_ARRAY=($_CRON_ARRAY); unset IFS
IFS=';'; EVENT_PATTERN_ARRAY=($_EVENT_PATTERN_ARRAY); unset IFS
IFS=';'; EVENT_BUS_ARN_ARRAY=($_EVENT_BUS_ARN_ARRAY); unset IFS
IFS=';'; TARGET_EVENT_BUS_ARN_ARRAY=($_TARGET_EVENT_BUS_ARN_ARRAY); unset IFS

echo "${CRON_ARRAY[@]}"
echo "${EVENT_PATTERN_ARRAY[@]}"
echo "${EVENT_BUS_ARN_ARRAY[@]}"
echo "${TARGET_EVENT_BUS_ARN_ARRAY[@]}"

echo XRAY_TRACING : $XRAY_TRACING
echo IAM_POLICY_DOCUMENT : $IAM_POLICY_DOCUMENT
echo TAGS_LIST : $TAGS_LIST

cd sam-sfn

ls -l ./state_machine/StateMachineWorkFlow.asl.json

if [ "$DEPLOYMENT_DESTINATION_ACCOUNT_IAM_ROLE_ARN" != null ]; then
  BEFORE=`aws sts get-caller-identity | jq -r .Arn`
  OUTPUT=`aws sts assume-role --role-arn ${DEPLOYMENT_DESTINATION_ACCOUNT_IAM_ROLE_ARN} --role-session-name sam-deploy-session`

  AWS_ACCESS_KEY_ID=`echo $OUTPUT | jq -r .Credentials.AccessKeyId`
  AWS_SECRET_ACCESS_KEY=`echo $OUTPUT | jq -r .Credentials.SecretAccessKey`
  AWS_SESSION_TOKEN=`echo $OUTPUT | jq -r .Credentials.SessionToken`

  AFTER=`aws sts get-caller-identity | jq -r .Arn`
fi

AWS_ACCOUNT=`aws sts get-caller-identity | jq -r .Account`

if [ -s ./state_machine/StateMachineWorkFlow.asl.json ]; then
  sam build \
    --template-file $SAM_FILE_NAME

  sam package \
    --template-file $SAM_FILE_NAME \
    --s3-bucket $BUCKET_NAME \
    --s3-prefix ${STATE_MACHINE_NAME}_${AWS_ACCOUNT} \
    --output-template-file output.yml
  
  if [ -n "$TAGS_LIST" ]; then
    sam deploy \
      --template-file output.yml \
      --s3-bucket $BUCKET_NAME \
      --s3-prefix ${STATE_MACHINE_NAME}_${AWS_ACCOUNT} \
      --stack-name $STATE_MACHINE_NAME \
      --capabilities CAPABILITY_IAM \
      --no-fail-on-empty-changeset \
      --parameter-overrides \
        StateMachineName=$STATE_MACHINE_NAME \
        StackUniqueId=$STACK_UNIQUE_ID \
        Cron1="'${CRON_ARRAY[0]}'" \
        Cron2="'${CRON_ARRAY[1]}'" \
        Cron3="'${CRON_ARRAY[2]}'" \
        Cron4="'${CRON_ARRAY[3]}'" \
        Cron5="'${CRON_ARRAY[4]}'" \
        EventPattern1="'${EVENT_PATTERN_ARRAY[0]}'" \
        EventPattern2="'${EVENT_PATTERN_ARRAY[1]}'" \
        EventPattern3="'${EVENT_PATTERN_ARRAY[2]}'" \
        EventPattern4="'${EVENT_PATTERN_ARRAY[3]}'" \
        EventPattern5="'${EVENT_PATTERN_ARRAY[4]}'" \
        EventBusArn1="'${EVENT_BUS_ARN_ARRAY[0]}'" \
        EventBusArn2="'${EVENT_BUS_ARN_ARRAY[1]}'" \
        EventBusArn3="'${EVENT_BUS_ARN_ARRAY[2]}'" \
        EventBusArn4="'${EVENT_BUS_ARN_ARRAY[3]}'" \
        EventBusArn5="'${EVENT_BUS_ARN_ARRAY[4]}'" \
        TargetEventBusArn1="'${TARGET_EVENT_BUS_ARN_ARRAY[0]}'" \
        TargetEventBusArn2="'${TARGET_EVENT_BUS_ARN_ARRAY[1]}'" \
        TargetEventBusArn3="'${TARGET_EVENT_BUS_ARN_ARRAY[2]}'" \
        TargetEventBusArn4="'${TARGET_EVENT_BUS_ARN_ARRAY[3]}'" \
        TargetEventBusArn5="'${TARGET_EVENT_BUS_ARN_ARRAY[4]}'" \
        XRayTracing=$XRAY_TRACING \
        IamPolicyDocument="'$IAM_POLICY_DOCUMENT'" \
      --tags "'$TAGS_LIST'"
  else
    sam deploy \
      --template-file output.yml \
      --s3-bucket $BUCKET_NAME \
      --s3-prefix ${STATE_MACHINE_NAME}_{$AWS_ACCOUNT} \
      --stack-name $STATE_MACHINE_NAME \
      --capabilities CAPABILITY_IAM \
      --no-fail-on-empty-changeset \
      --parameter-overrides \
        StateMachineName=$STATE_MACHINE_NAME \
        StackUniqueId=$STACK_UNIQUE_ID \
        Cron1="'${CRON_ARRAY[0]}'" \
        Cron2="'${CRON_ARRAY[1]}'" \
        Cron3="'${CRON_ARRAY[2]}'" \
        Cron4="'${CRON_ARRAY[3]}'" \
        Cron5="'${CRON_ARRAY[4]}'" \
        EventPattern1="'${EVENT_PATTERN_ARRAY[0]}'" \
        EventPattern2="'${EVENT_PATTERN_ARRAY[1]}'" \
        EventPattern3="'${EVENT_PATTERN_ARRAY[2]}'" \
        EventPattern4="'${EVENT_PATTERN_ARRAY[3]}'" \
        EventPattern5="'${EVENT_PATTERN_ARRAY[4]}'" \
        EventBusArn1="'${EVENT_BUS_ARN_ARRAY[0]}'" \
        EventBusArn2="'${EVENT_BUS_ARN_ARRAY[1]}'" \
        EventBusArn3="'${EVENT_BUS_ARN_ARRAY[2]}'" \
        EventBusArn4="'${EVENT_BUS_ARN_ARRAY[3]}'" \
        EventBusArn5="'${EVENT_BUS_ARN_ARRAY[4]}'" \
        TargetEventBusArn1="'${TARGET_EVENT_BUS_ARN_ARRAY[0]}'" \
        TargetEventBusArn2="'${TARGET_EVENT_BUS_ARN_ARRAY[1]}'" \
        TargetEventBusArn3="'${TARGET_EVENT_BUS_ARN_ARRAY[2]}'" \
        TargetEventBusArn4="'${TARGET_EVENT_BUS_ARN_ARRAY[3]}'" \
        TargetEventBusArn5="'${TARGET_EVENT_BUS_ARN_ARRAY[4]}'" \
        XRayTracing=$XRAY_TRACING \
        IamPolicyDocument="'$IAM_POLICY_DOCUMENT'"
  fi
  aws cloudformation describe-stacks --stack-name $STATE_MACHINE_NAME
else
  # If the ASL file is empty, delete the stack
  yes | \
  sam delete \
    --stack-name $STATE_MACHINE_NAME
fi
