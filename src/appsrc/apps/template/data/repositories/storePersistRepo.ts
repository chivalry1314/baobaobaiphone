import { createAppPersistOptions } from '../../../../../core/persistOptions';

export const createTemplatePersistOptions = <TState>() =>
  createAppPersistOptions<TState>({
    appId: 'template',
  });
