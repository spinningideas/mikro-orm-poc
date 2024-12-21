export function env(
  variable: string,
  defaultValue?: string
): string | undefined {
  const value = process.env[variable];
  return value || defaultValue;
}
