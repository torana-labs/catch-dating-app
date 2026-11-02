import {HttpsError} from "firebase-functions/v2/https";
import {GoogleAuth} from "google-auth-library";

export type BigQueryScalar = string | number | boolean | null;

export interface BigQueryQueryParameter {
  name: string;
  parameterType: Record<string, unknown>;
  parameterValue: Record<string, unknown>;
}

export interface BigQueryClient {
  query<T>(
    query: string,
    parameters?: BigQueryQueryParameter[],
  ): Promise<T[]>;

  insertRows(
    datasetId: string,
    tableId: string,
    rows: Array<{insertId: string; json: Record<string, unknown>}>,
  ): Promise<void>;
}

interface BigQueryQueryResponse {
  jobComplete?: boolean;
  jobReference?: {jobId?: string; location?: string};
  pageToken?: string;
  schema?: {
    fields?: Array<{name: string}>;
  };
  rows?: Array<{
    f?: Array<{v?: unknown}>;
  }>;
  errors?: Array<{message?: string}>;
  error?: {message?: string};
}

interface BigQueryInsertResponse {
  insertErrors?: Array<{
    index?: number;
    errors?: Array<{message?: string}>;
  }>;
  error?: {message?: string};
}

const bigQueryScope = "https://www.googleapis.com/auth/bigquery";
const queryWaitMillis = 50_000;

function assertQueryFinished(response: BigQueryQueryResponse): void {
  if (response.errors?.length) {
    throw new HttpsError(
      "internal",
      `BigQuery query failed: ${response.errors[0].message ?? "unknown"}`
    );
  }
  if (response.jobComplete === false) {
    throw new HttpsError("deadline-exceeded", "BigQuery query did not finish.");
  }
}

export class BigQueryRestClient implements BigQueryClient {
  constructor(
    private readonly projectId: string | null = null,
    private readonly auth = new GoogleAuth({scopes: [bigQueryScope]}),
  ) {}

  async query<T>(
    query: string,
    parameters: BigQueryQueryParameter[] = [],
  ): Promise<T[]> {
    let response = await this.post<BigQueryQueryResponse>(
      "/queries",
      {
        query,
        useLegacySql: false,
        parameterMode: "NAMED",
        queryParameters: parameters,
        timeoutMs: queryWaitMillis,
      }
    );
    const pages = [response];
    // Unfinished or partial results are never returned as if they were the
    // whole answer: a caller would read a missing row as "not there".
    assertQueryFinished(response);
    while (response.pageToken) {
      const job = response.jobReference ?? pages[0].jobReference;
      if (!job?.jobId) {
        throw new HttpsError("internal", "BigQuery query has no job to page.");
      }
      const search = new URLSearchParams({pageToken: response.pageToken,
        timeoutMs: String(queryWaitMillis)});
      if (job.location) search.set("location", job.location);
      response = await this.send<BigQueryQueryResponse>(
        `/queries/${encodeURIComponent(job.jobId)}?${search}`, "GET");
      assertQueryFinished(response);
      pages.push(response);
    }
    const fields = pages[0].schema?.fields ?? [];
    return pages.flatMap((page) => (page.rows ?? []).map((row) => {
      const values = row.f ?? [];
      return Object.fromEntries(fields.map((field, index) => [
        field.name,
        values[index]?.v ?? null,
      ])) as T;
    }));
  }

  async insertRows(
    datasetId: string,
    tableId: string,
    rows: Array<{insertId: string; json: Record<string, unknown>}>,
  ): Promise<void> {
    if (rows.length === 0) return;
    const response = await this.post<BigQueryInsertResponse>(
      `/datasets/${encodeURIComponent(datasetId)}` +
        `/tables/${encodeURIComponent(tableId)}/insertAll`,
      {
        skipInvalidRows: false,
        ignoreUnknownValues: false,
        rows,
      }
    );
    if (response.insertErrors?.length) {
      const firstError = response.insertErrors[0].errors?.[0]?.message ??
        "unknown insert error";
      throw new HttpsError(
        "internal",
        `BigQuery insert failed: ${firstError}`
      );
    }
  }

  private post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return this.send<T>(path, "POST", body);
  }

  private async send<T>(
    path: string,
    method: "GET" | "POST",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const projectId = this.projectId ?? resolveBigQueryProjectId();
    const url =
      "https://bigquery.googleapis.com/bigquery/v2/projects/" +
      `${encodeURIComponent(projectId)}${path}`;
    const client = await this.auth.getClient();
    const authHeaders = await client.getRequestHeaders(url);
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    authHeaders.forEach((value, key) => {
      headers[key] = value;
    });
    const response = await fetch(url, {
      method,
      headers,
      ...(body ? {body: JSON.stringify(body)} : {}),
    });
    const json = await response.json().catch(() => ({})) as
      BigQueryQueryResponse & BigQueryInsertResponse;
    if (!response.ok || json.error) {
      throw new HttpsError(
        "internal",
        `BigQuery request failed: ${json.error?.message ?? response.statusText}`
      );
    }
    return json as T;
  }
}

export function stringParam(
  name: string,
  value: string | null,
): BigQueryQueryParameter {
  return {
    name,
    parameterType: {type: "STRING"},
    parameterValue: value === null ? {} : {value},
  };
}

export function intParam(
  name: string,
  value: number,
): BigQueryQueryParameter {
  return {
    name,
    parameterType: {type: "INT64"},
    parameterValue: {value: String(Math.trunc(value))},
  };
}

export function dateParam(
  name: string,
  value: string,
): BigQueryQueryParameter {
  return {
    name,
    parameterType: {type: "DATE"},
    parameterValue: {value},
  };
}

export function stringArrayParam(
  name: string,
  values: string[],
): BigQueryQueryParameter {
  return {
    name,
    parameterType: {
      type: "ARRAY",
      arrayType: {type: "STRING"},
    },
    parameterValue: {
      arrayValues: values.map((value) => ({value})),
    },
  };
}

export const defaultBigQueryClient = new BigQueryRestClient();

function resolveBigQueryProjectId(): string {
  const explicit = process.env.HOST_ANALYTICS_BIGQUERY_PROJECT_ID ||
    process.env.BIGQUERY_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT;
  if (explicit) return explicit;
  const firebaseConfig = process.env.FIREBASE_CONFIG;
  if (firebaseConfig) {
    try {
      const parsed = JSON.parse(firebaseConfig) as {projectId?: unknown};
      if (typeof parsed.projectId === "string" && parsed.projectId.length > 0) {
        return parsed.projectId;
      }
    } catch {
      // Fall through to a deterministic configuration error below.
    }
  }
  throw new HttpsError(
    "failed-precondition",
    "BigQuery project id is not configured."
  );
}
