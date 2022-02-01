import { Construct } from "constructs";
import { Stack, StackProps, aws_events as events } from "aws-cdk-lib";

interface EventBusStackProps extends StackProps {
  eventBusName: string;
  eventsSourceAccounts: string[] | undefined;
}

export class EventBusStack extends Stack {
  constructor(scope: Construct, id: string, props: EventBusStackProps) {
    super(scope, id, props);

    // EventBus
    const eventBus = new events.EventBus(this, "EventBus", {
      eventBusName: props.eventBusName,
    });

    // If the AWS account to access EventBus is not specified, finish the process
    if (typeof props?.eventsSourceAccounts == "undefined") process.exit(0);

    // Add to the policy principal the number of AWS accounts that access the Event Bus
    props.eventsSourceAccounts.forEach((sourceAccount: string) => {
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
