type PayloadRecord = Record<string, unknown>;

const nullableContactFields = [
  "imageUrl",
  "profileImageUrl",
  "instagramHandle",
  "phoneNumber",
  "email",
  "hostAvatarUrl",
];

export function normalizeCreateOrganizerPayload(data: unknown): unknown {
  if (!isRecord(data)) return data;
  return normalizeFields(data, {
    stringFields: [
      "organizerId",
      "name",
      "description",
      "location",
      "area",
      "organizerType",
    ],
    nullableStringFields: nullableContactFields,
  });
}

export function normalizeUpdateOrganizerPayload(data: unknown): unknown {
  if (!isRecord(data)) return data;
  const payload = normalizeFields(data, {stringFields: ["organizerId"]});
  if (!isRecord(payload.fields)) return payload;
  return {
    ...payload,
    fields: normalizeFields(payload.fields, {
      stringFields: [
        "name",
        "description",
        "location",
        "area",
        "hostName",
        "organizerType",
      ],
      nullableStringFields: nullableContactFields,
      trimStringArrayFields: ["tags"],
    }),
  };
}

export function normalizeOrganizerIdPayload(data: unknown): unknown {
  if (!isRecord(data)) return data;
  return normalizeFields(data, {stringFields: ["organizerId"]});
}

export function normalizeOrganizerHostPayload(data: unknown): unknown {
  if (!isRecord(data)) return data;
  return normalizeFields(data, {
    stringFields: ["organizerId", "uid", "hostUid", "eventId", "phoneNumber"],
  });
}

function normalizeFields(
  data: PayloadRecord,
  options: {
    stringFields?: string[];
    nullableStringFields?: string[];
    trimStringArrayFields?: string[];
  }
): PayloadRecord {
  const result: PayloadRecord = {...data};
  for (const field of options.stringFields ?? []) {
    if (typeof result[field] === "string") {
      result[field] = result[field].trim();
    }
  }
  if (typeof result.location === "string") {
    result.location = result.location.toLowerCase();
  }
  for (const field of options.nullableStringFields ?? []) {
    if (typeof result[field] === "string") {
      result[field] = result[field].trim();
    }
  }
  for (const field of options.trimStringArrayFields ?? []) {
    if (Array.isArray(result[field])) {
      result[field] = result[field].map((item) =>
        typeof item === "string" ? item.trim() : item
      );
    }
  }
  return result;
}

function isRecord(value: unknown): value is PayloadRecord {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value);
}
