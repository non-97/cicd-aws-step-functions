#!/bin/bash

# -x to display the command to be executed
set -x

bucket_name="$1"
sam_file_name="$2"
repository_path="$3"

# Download the AWS SAM template file from the S3 bucket
aws s3 cp s3://${bucket_name}/${sam_file_name} ${sam_file_name}

# Display State Machine workflow
cat StateMachineWorkFlow.asl.json

# Move the necessary files to the AWS SAM directory
mkdir -p sam-sfn/state_machine

cp -p ${repository_path}StateMachineWorkFlow.asl.json ./sam-sfn/state_machine/StateMachineWorkFlow.asl.json
cp -p ${sam_file_name} ./sam-sfn/${sam_file_name}


# Get the ARN of the IAM role to be used when deploying
deployment_destination_account_iam_role_arn=$(yq -r ".Settings.deployment_destination_account_iam_role_arn" ${repository_path}StateMachineSettings.yml)
echo deployment_destination_account_iam_role_arn : ${deployment_destination_account_iam_role_arn}

# Get the Cron expression of the EventBridge rule associated with the State Machine
delimiter_text=IndexCron
template_parameter=$(yq -r ".Parameters.Cron${delimiter_text}" ./sam-sfn/${sam_file_name})
template_resource=$(yq -r ".Resources.ScheduledRule${delimiter_text}" ./sam-sfn/${sam_file_name})

waotemplate_parameter=$(yq -r ".Parameters.Cron${delimiter_text}" ./sam-sfn/${sam_file_name})
waotemplate_resource=$(yq -r ".Resources.ScheduledRule${delimiter_text}" ./sam-sfn/${sam_file_name})

echo "template_parameter"
echo "${template_parameter}"
echo "template_resource"
echo "${template_resource}"

echo "waotemplate_parameter"
echo "${waotemplate_parameter}"
echo "waotemplate_resource"
echo "${waotemplate_resource}"

cat ./sam-sfn/${sam_file_name} | \
  yq 'del(.Parameters.Cron'${delimiter_text}')' -Y | \
  yq 'del(.Resources.ScheduledRule'${delimiter_text}')' -Y | \
  tee ./sam-sfn/tmp_${sam_file_name}
mv ./sam-sfn/tmp_${sam_file_name} ./sam-sfn/${sam_file_name}

i=0
IFS=$'\n'; for cron in $(yq -rc ".Settings.event_bridge_rule[].cron? | select(.!=null)" ${repository_path}StateMachineSettings.yml); do
  sed -i -e "/${delimiter_text}/{ h; s/${delimiter_text}/${i}/g; G; }" build_command.sh

  cat ./sam-sfn/${sam_file_name} | \
    yq --argjson object "${template_parameter}" '.Parameters += {Cron'${i}': $object}' -Y | \
    yq --argjson object "${template_resource}" '.Resources += {ScheduledRule'${i}': $object}' -Y | \
    sed -e 's/Cron'${delimiter_text}'/Cron'${i}'/' | \
    tee ./sam-sfn/tmp_${sam_file_name}
  mv ./sam-sfn/tmp_${sam_file_name} ./sam-sfn/${sam_file_name}

  cron_array[$((i++))]=$(echo ${cron})
done
sed -i "/${delimiter_text}/d" build_command.sh
echo "${cron_array[@]}"

# Get the ARN of the Event Bus of the EventBridge rule event pattern associated with the State Machine
delimiter_text=IndexEventBusArn

i=0
IFS=$'\n'; for event_bus_arn in $(yq -rc ".Settings.event_bridge_rule[].event_bus_arn? | select(.!=null)" ${repository_path}StateMachineSettings.yml); do
  sed -i -e "/${delimiter_text}/{ h; s/${delimiter_text}/${i}/g; G; }" build_command.sh
  event_bus_arn_array[$((i++))]=$(echo ${event_bus_arn})
done
sed -i "/${delimiter_text}/d" build_command.sh
echo "${event_bus_arn_array[@]}"

# Get the event pattern of the EventBridge rule associated with the State Machine
delimiter_text_event_pattern=IndexEventPattern
delimiter_text_event_bus_arn=IndexEventBusArn
template_parameter_event_pattern=$(yq -r ".Parameters.EventPattern${delimiter_text_event_pattern}" ./sam-sfn/${sam_file_name})
template_parameter_event_bus_arn=$(yq -r ".Parameters.EventBusArn${delimiter_text_event_bus_arn}" ./sam-sfn/${sam_file_name})
template_resource_event_pattern=$(yq -r ".Resources.EventPatternRule${delimiter_text_event_pattern}" ./sam-sfn/${sam_file_name})

cat ./sam-sfn/${sam_file_name} | \
  yq 'del(.Parameters.EventPattern'${delimiter_text_event_pattern}')' -Y | \
  yq 'del(.Parameters.EventBusArn'${delimiter_text_event_bus_arn}')' -Y | \
  yq 'del(.Resources.EventPatternRule'${delimiter_text_event_pattern}')' -Y | \
  tee ./sam-sfn/tmp_${sam_file_name}
mv ./sam-sfn/tmp_${sam_file_name} ./sam-sfn/${sam_file_name}

i=0
IFS=$'\n'; for event_pattern in $(yq -rc ".Settings.event_bridge_rule[].event_pattern? | select(.!=null)" ${repository_path}StateMachineSettings.yml); do
  sed -i -e "/${delimiter_text_event_pattern}/{ h; s/${delimiter_text_event_pattern}/${i}/g; G; }" build_command.sh

  cat ./sam-sfn/${sam_file_name} | \
    yq --argjson object "${template_parameter_event_pattern}" '.Parameters += {EventPattern'${i}': $object}' -Y | \
    yq --argjson object "${template_parameter_event_bus_arn}" '.Parameters += {EventBusArn'${i}': $object}' -Y | \
    yq --argjson object "${template_resource_event_pattern}" '.Resources += {EventPatternRule'${i}': $object}' -Y | \
    sed -e 's/EventPattern'${delimiter_text_event_pattern}'/EventPattern'${i}'/' | \
    sed -e 's/EventBusArn'${delimiter_text_event_bus_arn}'/EventBusArn'${i}'/' | \
    tee ./sam-sfn/tmp_${sam_file_name}
  mv ./sam-sfn/tmp_${sam_file_name} ./sam-sfn/${sam_file_name}

  event_pattern_array[$((i++))]=$(echo ${event_pattern})
done
sed -i "/${delimiter_text_event_pattern}/d" build_command.sh
echo "${event_pattern_array[@]}"


# Get the ARN of the Event Bus that puts an event when the State Machine finishes successfully
delimiter_text=IndexTargetEventBusArn
template_parameter_target_event_bus_arn=$(yq -r ".Parameters.TargetEventBusArn${delimiter_text}" ./sam-sfn/${sam_file_name})
template_resource_target_event_bus_arn_rule=$(yq -r ".Resources.TargetEventBusArnRule${delimiter_text}" ./sam-sfn/${sam_file_name})
template_resource_target_event_bus_arn_role=$(yq -r ".Resources.InvokeEventBusRole${delimiter_text}" ./sam-sfn/${sam_file_name})

cat ./sam-sfn/${sam_file_name} | \
  yq 'del(.Parameters.TargetEventBusArn'${delimiter_text}')' -Y | \
  yq 'del(.Resources.TargetEventBusArnRule'${delimiter_text}')' -Y | \
  yq 'del(.Resources.InvokeEventBusRole'${delimiter_text}')' -Y | \
  tee ./sam-sfn/tmp_${sam_file_name}
mv ./sam-sfn/tmp_${sam_file_name} ./sam-sfn/${sam_file_name}

i=0
IFS=$'\n'; for target_event_bus_arn in $(yq -rc ".Settings.target_event_bus_arn[]" ${repository_path}StateMachineSettings.yml); do
  sed -i -e "/${delimiter_text}/{ h; s/${delimiter_text}/${i}/g; G; }" build_command.sh

  cat ./sam-sfn/${sam_file_name} | \
    yq --argjson object "${template_parameter_target_event_bus_arn}" '.Parameters += {TargetEventBusArn'${i}': $object}' -Y | \
    yq --argjson object "${template_resource_target_event_bus_arn_rule}" '.Resources += {TargetEventBusArnRule'${i}': $object}' -Y | \
    yq --argjson object "${template_resource_target_event_bus_arn_role}" '.Resources += {InvokeEventBusRole'${i}': $object}' -Y | \
    sed -e 's/TargetEventBusArn'${delimiter_text}'/TargetEventBusArn'${i}'/g' | \
    sed -e 's/InvokeEventBusRole'${delimiter_text}'/InvokeEventBusRole'${i}'/g' | \
    tee ./sam-sfn/tmp_${sam_file_name}
  mv ./sam-sfn/tmp_${sam_file_name} ./sam-sfn/${sam_file_name}

  target_event_bus_arn_array[$((i++))]=$(echo ${target_event_bus_arn})
done
sed -i "/${delimiter_text}/d" build_command.sh
echo "${target_event_bus_arn_array[@]}"

# Get whether State Machine enables X-Ray tracing
xray_tracing=$(yq -r ".Settings.xray_tracing" ${repository_path}StateMachineSettings.yml)
echo xray_tracing : ${xray_tracing}

# Get the IAM Policy document to attach to the IAM Role associated with the State Machine
iam_policy_document=$(yq -r ".Settings.iam_policy_document" ${repository_path}StateMachineSettings.yml)
echo iam_policy_document : ${iam_policy_document}

# Get tags to attach to resources created by CloudFormation
IFS=$'\n'; for tag in $(yq -rc ".Settings.tags[]" ${repository_path}StateMachineSettings.yml); do
  key=$(echo ${tag} | jq -r .Key)
  value=$(echo ${tag} | jq -r .Value)
  tags_list+=$(echo "'${key}'"="'${value}' ")
done
echo tags_list : ${tags_list}


# Change arrays temporarily to strings
tmp_cron_array=$(IFS=';'; echo "${cron_array[*]}")
tmp_event_pattern_array=$(IFS=';'; echo "${event_pattern_array[*]}")
tmp_event_bus_arn_array=$(IFS=';'; echo "${event_bus_arn_array[*]}")
tmp_target_event_bus_arn_array=$(IFS=';'; echo "${target_event_bus_arn_array[*]}")