function isRegex(src: any /* eslint-disable-line @typescript-eslint/no-explicit-any */): src is RegExp {
  return Object.prototype.toString.call(src) === '[object RegExp]';
}

function isArray<T>(src: any /* eslint-disable-line @typescript-eslint/no-explicit-any */): src is T[] {
  return Array.isArray(src);
}

export function merge<
  T extends Record<string, any> /* eslint-disable-line @typescript-eslint/no-explicit-any */,
  U extends Record<string, any> /* eslint-disable-line @typescript-eslint/no-explicit-any */,
>(src: T, target: U): T & U {
  const deepClone = (src: unknown): unknown => {
    if (typeof src !== 'object' || src === null || isRegex(src)) {
      return src;
    }

    const clone: Record<string, any> = isArray(src) ? [] : {}; /* eslint-disable-line @typescript-eslint/no-explicit-any */
    for (const key in src) {
      if (Object.prototype.hasOwnProperty.call(src, key)) {
        const value = (src as Record<string, unknown>)[key];
        clone[key] = deepClone(value);
      }
    }
    return clone;
  };

  const clonedSrc = deepClone(src) as T & Partial<U>;
  for (const key in target) {
    if (clonedSrc[key] === undefined) {
      clonedSrc[key] = target[key] as any; /* eslint-disable-line @typescript-eslint/no-explicit-any */
    }
  }
  return clonedSrc as T & U;
}
