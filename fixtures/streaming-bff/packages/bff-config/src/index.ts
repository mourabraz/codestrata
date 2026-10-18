import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface BffConfig {
  port: number;
  persistedOperationsOnly: boolean;
  endpoints: {
    catalogApi: string;
    peopleApi: string;
    promotionsApi: string;
    availabilityApi: string;
    cmsApi: string;
  };
}

export interface ConfigSelector {
  brand: string;
  env: string;
}

const CONFIG_DIR = join(import.meta.dirname, '..', 'config');

function readJson(file: string): Partial<BffConfig> {
  return JSON.parse(readFileSync(join(CONFIG_DIR, file), 'utf8')) as Partial<BffConfig>;
}

/** Merges `default.json` with the brand/env override (`<brand>.<env>.json`), when one exists. */
export function loadConfig({ brand, env }: ConfigSelector): BffConfig {
  const base = readJson('default.json') as BffConfig;
  const overrideFile = `${brand}.${env}.json`;
  if (!existsSync(join(CONFIG_DIR, overrideFile))) {
    return base;
  }
  const override = readJson(overrideFile);
  return { ...base, ...override, endpoints: { ...base.endpoints, ...override.endpoints } };
}

export function configSelectorFromEnv(env: NodeJS.ProcessEnv = process.env): ConfigSelector {
  return { brand: env.BRAND ?? 'streamco', env: env.APP_ENV ?? 'local' };
}
