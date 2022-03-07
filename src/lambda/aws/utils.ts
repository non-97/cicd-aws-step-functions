export const getRegion = () => {
  //AWS_REGION － Lambda 関数が実行される AWS リージョン。
  return process.env.AWS_REGION!;
};
export const getAWSAccount = (context: AWSLambda.Context) => {
  // ex: arn:aws:lambda:ap-northeast-1:xxxxxxxxxxxxxxxx:function:test
  return context.invokedFunctionArn.split(":")[4];
};
