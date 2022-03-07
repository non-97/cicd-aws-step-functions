import { SFNClient, ListExecutionsCommand } from "@aws-sdk/client-sfn";

interface Event {
  stateMachineArn: string;
}

export const handler = async (event: Event): Promise<number | Error> => {
  if (!event.stateMachineArn) {
    throw new Error(
      "The argument does not specify the Arn of the State Machine."
    );
  }

  if (
    !process.env["UTC_OFFSET"] ||
    isNaN(Number(process.env["UTC_OFFSET"])) ||
    Number(process.env["UTC_OFFSET"]) > 14 ||
    Number(process.env["UTC_OFFSET"]) < -12
  ) {
    throw new Error(
      `The environment variable for UTC offset (UTC_OFFSET) has not been entered correctly. e.g. For Asia/Tokyo, "9". For America/Los_Angeles, "-8".`
    );
  }

  if (
    !process.env["BASE_LOCAL_TIME"] ||
    !process.env["BASE_LOCAL_TIME"].match(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
  ) {
    throw new Error(
      `The environment variable for base time (BASE_LOCAL_TIME) has not been entered correctly. e.g. 07:30`
    );
  }

  if (!process.env["REGION"]) {
    throw new Error(
      `The region name environment variable (REGION_NAME) is not specified. e.g. us-east-1`
    );
  }

  const stateMachineArn: string = event.stateMachineArn;
  const utcOffset: number = Number(process.env["UTC_OFFSET"]);
  const baseLocalTime: string[] = process.env["BASE_LOCAL_TIME"].split(":");
  const region: string = process.env["REGION"];

  // Set State Machine Client
  const sfnClient = new SFNClient({
    region: region,
  });

  // Time difference from UTC (millisecond)
  const utcOffsetMillisecond =
    (new Date().getTimezoneOffset() + utcOffset * 60) * 60 * 1000;

  // Set the current local date
  const currentLocalDate = new Date(Date.now() + utcOffsetMillisecond);

  // Convert base date to local date
  const tempBaseLocalDateMillisecond = new Date(
    currentLocalDate.getFullYear(),
    currentLocalDate.getMonth(),
    currentLocalDate.getDate(),
    Number(baseLocalTime[0]),
    Number(baseLocalTime[1])
  ).getTime();

  // Calculating the base time for a date change (UTC)
  const baseUtcDate =
    currentLocalDate.getTime() < tempBaseLocalDateMillisecond
      ? new Date(
          tempBaseLocalDateMillisecond -
            utcOffsetMillisecond -
            24 * 60 * 60 * 1000
        )
      : new Date(tempBaseLocalDateMillisecond - utcOffsetMillisecond);

  // Get a list of the execution history for the specified State Machine
  const response = await sfnClient
    .send(new ListExecutionsCommand({ stateMachineArn: stateMachineArn }))
    .catch((error: any) => {
      console.error("ListExecutionsCommand failed. \n\n", error);
    });

  console.log(response);
  console.log(`baseUtcDate : ${baseUtcDate}`);

  // Return 1 if the specified State Machine has a history of being executed after the base time
  if (
    !response?.executions ||
    (response?.executions[1]?.startDate &&
      response.executions[1].startDate > baseUtcDate)
  ) {
    return 1;
  }

  return 0;
};
