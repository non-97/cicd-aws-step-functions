import { Construct } from "constructs";
import { Stack, StackProps, aws_events as events } from "aws-cdk-lib";

interface EventBusStackProps extends StackProps {
  sourceAccounts: string | undefined;
}

export class EventBusStack extends Stack {
  constructor(scope: Construct, id: string, props?: EventBusStackProps) {
    super(scope, id, props);

    const eventBus = new events.EventBus(this, "EventBus", {
      eventBusName: "StateMachineBus",
    });

    if (typeof props?.sourceAccounts == "undefined") process.exit(0);

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
