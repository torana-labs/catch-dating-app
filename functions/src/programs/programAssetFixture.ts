import type {ProgramBucket} from "./programAssets";

/** Test double for the private programme bucket: stored objects with
 *  their metadata, signed URLs that name the path, and recorded deletes. */
export class FakeProgramBucket {
  readonly objects = new Map<string, {size: number; contentType: string;
    metadata: Record<string, string>}>();
  readonly deleted: string[] = [];
  readonly policies: {path: string; fields: Record<string, string>}[] = [];

  /** Stores an object the way a signed POST would have. */
  put(path: string, params: {programId: string; subject: string;
    contentType?: string; size?: number; assetId?: string}): void {
    this.objects.set(path, {
      size: params.size ?? 1024,
      contentType: params.contentType ?? "image/jpeg",
      metadata: {
        "asset-id": params.assetId ?? path.split("/").pop()!,
        "program-id": params.programId,
        "subject": params.subject,
      },
    });
  }

  file(path: string) {
    return {
      getMetadata: async () => {
        const object = this.objects.get(path);
        if (!object) throw new Error("No such object");
        return [{size: String(object.size), contentType: object.contentType,
          metadata: object.metadata}];
      },
      delete: async () => {
        this.deleted.push(path);
        this.objects.delete(path);
        return [{}];
      },
      getSignedUrl: async () => [`https://signed.example/${path}`],
      generateSignedPostPolicyV4: async (options: {fields:
        Record<string, string>}) => {
        this.policies.push({path, fields: options.fields});
        return [{url: "https://upload.example/", fields: {
          ...options.fields, key: path, policy: "signed"}}];
      },
    };
  }

  asBucket(): ProgramBucket {
    return this as unknown as ProgramBucket;
  }
}
