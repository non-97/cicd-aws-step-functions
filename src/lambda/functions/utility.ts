export const getParametersFromEnvVar = (
  name: string,
  example: string
): string => {
  const target = process.env[name];

  // If the required environment variables do not exist, the process is exited
  if (target === undefined) {
    throw new Error(
      `The environment variable "${name}" is not specified. e.g. ${example}`
    );
  }
  return target;
};
