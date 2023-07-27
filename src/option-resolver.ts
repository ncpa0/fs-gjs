type Defined<T> = T extends undefined ? never : T;

type ValidateFn = (value: any) => void;

export interface OptionsResolver<O> {
  get<K extends keyof O, V>(
    key: K,
    defaultValue: V,
  ): Defined<O[K]> | V;
  get<K extends keyof O>(key: K): O[K] | undefined;
  setDefault<K extends keyof O>(
    key: K,
    defaultValue: NonNullable<O>[K],
  ): void;
}

export type OptionValidators = Map<string, ValidateFn>;

export const OptionsResolver = <O>(
  options: O | undefined,
  validators: OptionValidators,
) => {
  options = options ? ({ ...options } as O) : ({} as O);

  function get<K extends keyof O, V>(
    key: K,
    defaultValue: V,
    validate?: ValidateFn,
  ): Defined<O[K]> | V;
  function get<K extends keyof O>(
    key: K,
    validate?: ValidateFn,
  ): O[K] | undefined;
  function get(key: keyof O, defaultValue: any = undefined) {
    if (options![key] != null) {
      const validator = validators.get(key as string);
      validator?.(options![key]);
      return options![key];
    }

    return defaultValue;
  }

  function setDefault<K extends keyof O, V>(
    key: K,
    defaultValue: NonNullable<O>[K],
  ) {
    if (options![key] == null) {
      options![key] = defaultValue;
    }
  }

  return { get, setDefault };
};
