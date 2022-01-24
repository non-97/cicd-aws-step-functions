#!/bin/bash

# -x to display the command to be executed
set -x

bucket_name="$1"
sam_file_name="$2"
stack_name="$3"
state_machine_name="$4"
stack_id_after_stack_name="$5"

echo STATE_MACHINE_IAM_ROLE : $STATE_MACHINE_IAM_ROLE
echo CRON : "'$CRON'"
echo EVENT_PATTERN : "'$EVENT_PATTERN'"
echo TARGET_EVENT_BUS_ARN_AFTER_EXECUTION : "'$TARGET_EVENT_BUS_ARN_AFTER_EXECUTION'"

cd sam-sfn

ls -l ./statemachine/StateMachineWorkFlow.asl.json

if [ -s ./statemachine/StateMachineWorkFlow.asl.json ]; then
  sam build \
    --template-file $sam_file_name

  sam package \
    --template-file $sam_file_name \
    --s3-bucket $bucket_name \
    --s3-prefix $stack_name-p/ \
    --output-template-file output.yml
  
  sam deploy \
    --template-file output.yml \
    --s3-bucket $bucket_name \
    --s3-prefix $stack_name-p/ \
    --stack-name $state_machine_name \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset \
    --parameter-overrides StateMachineName=$state_machine_name StackIdAfterStackName=$stack_id_after_stack_name Cron="'$CRON'" EventPattern="'$EVENT_PATTERN'" TargetEventBusArnAfterExecution="'$TARGET_EVENT_BUS_ARN_AFTER_EXECUTION'" 

  aws cloudformation describe-stacks --stack-name $state_machine_name
else
  # If the ASL file is empty, delete the stack.
  yes | \
  sam delete \
    --stack-name $state_machine_name
fi
