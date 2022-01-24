interface Event {
  targetLocalTime: string;
}

export const handler = async (event: Event): Promise<number | null> => {
  if (
    !event.targetLocalTime ||
    !event.targetLocalTime.match(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
  ) {
    console.error(`
      The argument for the target time (targetLocalTime) has not been entered correctly.
      e.g. 23:30`);
    return null;
  }

  if (
    !process.env["UTC_OFFSET"] ||
    isNaN(Number(process.env["UTC_OFFSET"])) ||
    Number(process.env["UTC_OFFSET"]) > 14 ||
    Number(process.env["UTC_OFFSET"]) < -12
  ) {
    console.error(`
      The environment variable for UTC offset (UTC_OFFSET) has not been entered correctly.
      e.g. For Asia/Tokyo, "9". For America/Los_Angeles, "-8".`);
    return null;
  }

  if (
    !process.env["BASE_LOCAL_TIME"] ||
    !process.env["BASE_LOCAL_TIME"].match(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
  ) {
    console.error(`
      The environment variable for base time (BASE_LOCAL_TIME) has not been entered correctly.
      e.g. 07:30`);
    return null;
  }

  const targetLocalTime: string[] = event.targetLocalTime.split(":");
  const utcOffset: number = Number(process.env["UTC_OFFSET"]);
  const baseLocalTime: string[] = process.env["BASE_LOCAL_TIME"].split(":");

  // Time difference from UTC (millisecond)
  const utcOffsetMillisecond =
    (new Date().getTimezoneOffset() + utcOffset * 60) * 60 * 1000;

  // Set the current local date
  const currentLocalDate = new Date(Date.now() + utcOffsetMillisecond);

  console.log(`currentLocalDate : ${currentLocalDate}`);

  // Convert the base date to a local date
  const tempBaseLocalDateMillisecond = new Date(
    currentLocalDate.getFullYear(),
    currentLocalDate.getMonth(),
    currentLocalDate.getDate(),
    Number(baseLocalTime[0]),
    Number(baseLocalTime[1])
  ).getTime();

  // Calculating the base date for a date change
  const baseLocalDate =
    currentLocalDate.getTime() < tempBaseLocalDateMillisecond
      ? new Date(tempBaseLocalDateMillisecond - 24 * 60 * 60 * 1000)
      : new Date(tempBaseLocalDateMillisecond);

  console.log(`baseLocalDate : ${baseLocalDate}`);

  // Convert the target date to a local date
  const tempTargetLocalDateMillisecond = new Date(
    baseLocalDate.getFullYear(),
    baseLocalDate.getMonth(),
    baseLocalDate.getDate(),
    Number(targetLocalTime[0]),
    Number(targetLocalTime[1])
  ).getTime();

  // Calculating the target date
  const targetLocalDate =
    baseLocalDate.getTime() > tempTargetLocalDateMillisecond
      ? new Date(tempTargetLocalDateMillisecond + 24 * 60 * 60 * 1000)
      : new Date(tempTargetLocalDateMillisecond);

  console.log(`targetLocalDate : ${targetLocalDate}`);

  // Return the difference between the current date and the target date
  const secounds = Math.round(
    (targetLocalDate.getTime() - currentLocalDate.getTime()) / 1000
  );

  console.log(`secounds : ${secounds}`);

  return secounds;
};
