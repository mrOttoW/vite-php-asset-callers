function isRegex(src: any): src is RegExp {
  return Object.prototype.toString.call(src) === '[object RegExp]';
}

function isString(src: any): src is string {
  return Object.prototype.toString.call(src) === '[object String]';
}

function isArray<T>(src: any): src is Array<T> {
  return Array.isArray(src);
}
export function merge<T extends Record<string, any>, U extends Record<string, any>>(src: T, target: U): T & U {
  const deepClone = (src: unknown): unknown => {
    if (typeof src !== 'object' || src === null || isRegex(src)) {
      return src;
    }

    const clone: Record<string, any> = isArray(src) ? [] : {};
    for (const key in src) {
      if (src.hasOwnProperty(key)) {
        const value = (src as Record<string, unknown>)[key];
        clone[key] = deepClone(value);
      }
    }
    return clone;
  };

  const clonedSrc = deepClone(src) as T & Partial<U>;
  for (const key in target) {
    if (clonedSrc[key] === undefined) {
      clonedSrc[key] = target[key] as any;
    }
  }
  return clonedSrc as T & U;
}
