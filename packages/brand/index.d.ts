import type record from "./brand.json";

type DeepReadonly<T> = {readonly [K in keyof T]: T[K] extends object | null ? DeepReadonly<T[K]> : T[K]};

/** A store listing URL, or null while the app is not live on that store. */
export type StoreLink = string | null;
export type StoreLinks = {readonly ios: StoreLink; readonly android: StoreLink};
type BrandRecord = Omit<typeof record, "$schema">;
type StoreRecord = DeepReadonly<Omit<BrandRecord["stores"], "consumer" | "host">> &
  {readonly consumer: StoreLinks; readonly host: StoreLinks};

export type Brand = DeepReadonly<Omit<BrandRecord, "stores">> & {readonly stores: StoreRecord};

export declare const brand: Brand;
export declare const instagramUrl: string;
export declare function webUrl(path?: `/${string}`): string;
export declare function resolveBrandToken(path: string): string;
export declare function applyBrandText(text: string): string;
export declare function applyBrand<T>(value: T): T;
export declare function brandConsistencyErrors(candidate?: Brand): string[];
