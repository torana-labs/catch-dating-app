import type record from "./brand.json";

type DeepReadonly<T> = {readonly [K in keyof T]: T[K] extends object | null ? DeepReadonly<T[K]> : T[K]};

export type Brand = DeepReadonly<Omit<typeof record, "$schema">>;

export declare const brand: Brand;
export declare const instagramUrl: string;
export declare function webUrl(path?: `/${string}`): string;
export declare function resolveBrandToken(path: string): string;
export declare function applyBrandText(text: string): string;
export declare function applyBrand<T>(value: T): T;
export declare function brandConsistencyErrors(candidate?: Brand): string[];
