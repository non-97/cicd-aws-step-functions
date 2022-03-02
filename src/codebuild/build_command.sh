#!/bin/bash

# -x to display the command to be executed
set -x

bucket_name="$1"
sam_file_name="$2"
state_machine_name="$3"
stack_unique_id="$4"

echo deployment_destination_account_iam_role_arn : ${deployment_destination_account_iam_role_arn}

IFS=';'; cron_array=(${_cron_array}); unset IFS
IFS=';'; event_pattern_array=(${_event_pattern_array}); unset IFS
IFS=';'; event_bus_arn_array=(${_event_bus_arn_array}); unset IFS
IFS=';'; target_event_bus_arn_array=(${_target_event_bus_arn_array}); unset IFS

echo "${cron_array[@]}"
echo "${event_pattern_array[@]}"
echo "${event_bus_arn_array[@]}"
echo "${target_event_bus_arn_array[@]}"

echo xray_tracing : ${xray_tracing}
echo iam_policy_document : ${iam_policy_document}
echo tags_list : ${tags_list}

cd sam-sfn

ls -l ./state_machine/StateMachineWorkFlow.asl.json

if [[ "${deployment_destination_account_iam_role_arn}" != null ]]; then
  before=$(aws sts get-caller-identity | jq -r .Arn)
  output=$(aws sts assume-role --role-arn ${deployment_destination_account_iam_role_arn} --role-session-name sam-deploy-session)

  AWS_ACCESS_KEY_ID=$(echo ${output} | jq -r .Credentials.AccessKeyId)
  AWS_SECRET_ACCESS_KEY=$(echo ${output} | jq -r .Credentials.SecretAccessKey)
  AWS_SESSION_TOKEN=$(echo ${output} | jq -r .Credentials.SessionToken)

  after=$(aws sts get-caller-identity | jq -r .Arn)
fi

AWS_ACCOUNT=$(aws sts get-caller-identity | jq -r .Account)

if [[ -s ./state_machine/StateMachineWorkFlow.asl.json ]]; then
  sam build \
    --template-file ${sam_file_name}

  sam package \
    --template-file ${sam_file_name} \
    --s3-bucket ${bucket_name} \
    --s3-prefix ${state_machine_name}_${AWS_ACCOUNT} \
    --output-template-file output.yml

  deploy_command=(sam deploy \
      --template-file output.yml \
      --s3-bucket ${bucket_name} \
      --s3-prefix ${state_machine_name}_${AWS_ACCOUNT} \
      --stack-name ${state_machine_name} \
      --capabilities CAPABILITY_IAM \
      --no-fail-on-empty-changeset \
      --parameter-overrides \
        StateMachineName=${state_machine_name} \
        StackUniqueId=${stack_unique_id} \
        Cron1="'${cron_array[0]}'" \
        Cron2="'${cron_array[1]}'" \
        Cron3="'${cron_array[2]}'" \
        Cron4="'${cron_array[3]}'" \
        Cron5="'${cron_array[4]}'" \
        EventPattern1="'${event_pattern_array[0]}'" \
        EventPattern2="'${event_pattern_array[1]}'" \
        EventPattern3="'${event_pattern_array[2]}'" \
        EventPattern4="'${event_pattern_array[3]}'" \
        EventPattern5="'${event_pattern_array[4]}'" \
        EventBusArn1="'${event_bus_arn_array[0]}'" \
        EventBusArn2="'${event_bus_arn_array[1]}'" \
        EventBusArn3="'${event_bus_arn_array[2]}'" \
        EventBusArn4="'${event_bus_arn_array[3]}'" \
        EventBusArn5="'${event_bus_arn_array[4]}'" \
        TargetEventBusArn1="'${target_event_bus_arn_array[0]}'" \
        TargetEventBusArn2="'${target_event_bus_arn_array[1]}'" \
        TargetEventBusArn3="'${target_event_bus_arn_array[2]}'" \
        TargetEventBusArn4="'${target_event_bus_arn_array[3]}'" \
        TargetEventBusArn5="'${target_event_bus_arn_array[4]}'" \
        XRayTracing=${xray_tracing} \
        IamPolicyDocument="'${iam_policy_document}'")

  if [[ -n "${tags_list}" ]]; then
    "${deploy_command[@]}" \
      --tags "'${tags_list}'"
  else
    "${deploy_command[@]}"
  fi
  aws cloudformation describe-stacks --stack-name ${state_machine_name}
else
  # If the ASL file is empty, delete the stack
  yes | \
  sam delete \
    --stack-name ${state_machine_name}
fi
