type Defined<T> = T extends undefined ? never : T;

export const OptionsResolver = <O>(options: O | undefined) => {
  options = { ...options } as O;

  function get<K extends keyof O, V>(
    key: K,
    defaultValue: V
  ): Defined<O[K]> | V;
  function get<K extends keyof O>(key: K): O[K] | undefined;
  function get(key: keyof O, defaultValue: any = undefined) {
    if (options == null) {
      return defaultValue;
    }
    return options[key] ?? defaultValue;
  }

  return { get };
};
