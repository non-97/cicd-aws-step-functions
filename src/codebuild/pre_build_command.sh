#!/bin/bash

# -x to display the command to be executed
set -x

bucket_name="$1"
sam_file_name="$2"
repository_path="$3"

deployment_destination_account_iam_role_arn=$(yq -r ".Settings.deployment_destination_account_iam_role_arn" ${repository_path}StateMachineSettings.yml)
echo deployment_destination_account_iam_role_arn : ${deployment_destination_account_iam_role_arn}

i=0
IFS=$'\n'; for cron in $(yq -rc ".Settings.event_bridge_rule[].cron? | select(.!=null)" ${repository_path}StateMachineSettings.yml); do
  cron_array[$((i++))]=$(echo ${cron})
done
echo "${cron_array[@]}"

i=0
IFS=$'\n'; for event_pattern in $(yq -rc ".Settings.event_bridge_rule[].event_pattern? | select(.!=null)" ${repository_path}StateMachineSettings.yml); do
  event_pattern_array[$((i++))]=$(echo ${event_pattern})
done
echo "${event_pattern_array[@]}"

i=0
IFS=$'\n'; for event_bus_arn in $(yq -rc ".Settings.event_bridge_rule[].event_bus_arn? | select(.!=null)" ${repository_path}StateMachineSettings.yml); do
  event_bus_arn_array[$((i++))]=$(echo ${event_bus_arn})
done
echo "${event_bus_arn_array[@]}"

i=0
IFS=$'\n'; for target_event_bus_arn in $(yq -rc ".Settings.target_event_bus_arn[]" ${repository_path}StateMachineSettings.yml); do
  target_event_bus_arn_array[$((i++))]=$(echo ${target_event_bus_arn})
done
echo "${target_event_bus_arn_array[@]}"

xray_tracing=$(yq -r ".Settings.xray_tracing" ${repository_path}StateMachineSettings.yml)
echo xray_tracing : ${xray_tracing}

iam_policy_document=$(yq -r ".Settings.iam_policy_document" ${repository_path}StateMachineSettings.yml)
echo iam_policy_document : ${iam_policy_document}

IFS=$'\n'; for tag in $(yq -rc ".Settings.tags[]" ${repository_path}StateMachineSettings.yml); do
  key=$(echo ${tag} | jq -r .Key)
  value=$(echo ${tag} | jq -r .Value)
  tags_list+=$(echo "'${key}'"="'${value}' ")
done
echo tags_list : ${tags_list}

# Download the AWS SAM template file from the S3 bucket
aws s3 cp s3://${bucket_name}/${sam_file_name} ${sam_file_name}

cat StateMachineWorkFlow.asl.json

# Move the necessary files to the AWS SAM directory
mkdir -p sam-sfn/state_machine

cp -p ${repository_path}StateMachineWorkFlow.asl.json ./sam-sfn/state_machine/StateMachineWorkFlow.asl.json
cp -p ${sam_file_name} ./sam-sfn/${sam_file_name}

_cron_array=$(IFS=';'; echo "${cron_array[*]}")
_event_pattern_array=$(IFS=';'; echo "${event_pattern_array[*]}")
_event_bus_arn_array=$(IFS=';'; echo "${event_bus_arn_array[*]}")
_target_event_bus_arn_array=$(IFS=';'; echo "${target_event_bus_arn_array[*]}")