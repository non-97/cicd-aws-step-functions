import { Construct } from "constructs";
import { Stack, StackProps, aws_events as events } from "aws-cdk-lib";

interface EventBusStackProps extends StackProps {
  sourceAccounts: string | undefined;
}

export class EventBusStack extends Stack {
  constructor(scope: Construct, id: string, props?: EventBusStackProps) {
    super(scope, id, props);

    // EventBus
    const eventBus = new events.EventBus(this, "EventBus", {
      eventBusName: "StateMachineBus",
    });

    // If the AWS account to access EventBus is not specified, finish the process.
    if (typeof props?.sourceAccounts == "undefined") process.exit(0);

    // Add to the policy principal the number of AWS accounts that access the EventBus.
    JSON.parse(props.sourceAccounts).forEach((sourceAccount: string) => {
      new events.CfnEventBusPolicy(
        this,
        `CrossAccountPolicy_${sourceAccount}`,
        {
          action: "events:PutEvents",
          eventBusName: eventBus.eventBusName,
          principal: sourceAccount,
          statementId: `AcceptFrom_${sourceAccount}`,
        }
      );
    });
  }
}
