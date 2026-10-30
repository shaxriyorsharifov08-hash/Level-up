/** Read a single string value from Next.js `searchParams`. */
export function param(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() ? v.trim() : undefined;
}

export function oneOf<T extends string>(value: string | undefined, options: readonly T[]): T | undefined {
  return options.includes(value as T) ? (value as T) : undefined;
}
