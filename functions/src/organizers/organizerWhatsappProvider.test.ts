import assert from "node:assert/strict";
import test from "node:test";
import {SecretVersionReferenceGuard} from "../shared/secretVersionReference";
import {
  MetaWhatsappProvider,
  MetaProviderError,
  OrganizerTokenStore,
  MetaTemplateSnapshot,
} from "./organizerWhatsappProvider";
import {BRAND} from "../shared/generated/brand";

const config = {
  appId: "app-id",
  appSecret: "app-secret",
  configId: "config-id",
  graphVersion: "v23.0",
};

test("authorization exchange keeps credentials in server request", async () => {
  let requestedUrl = "";
  const provider = new MetaWhatsappProvider(config, async (input) => {
    requestedUrl = input.toString();
    return new Response(JSON.stringify({access_token: "token-1"}), {
      status: 200,
    });
  });
  assert.equal(await provider.exchangeAuthorizationCode("code-1"), "token-1");
  const requested = new URL(requestedUrl);
  assert.equal(requested.hostname, "graph.facebook.com");
  assert.equal(requested.searchParams.get("client_secret"), "app-secret");
  assert.equal(requested.searchParams.get("code"), "code-1");
});

test("sender verification rejects a phone outside selected WABA", async () => {
  const provider = new MetaWhatsappProvider(config, async (input) => {
    const url = new URL(input.toString());
    if (url.pathname.endsWith("/waba-1")) {
      return jsonResponse({owner_business_info: {id: "business-1"}});
    }
    if (url.pathname.endsWith("/waba-1/phone_numbers")) {
      return jsonResponse({data: [{id: "phone-other"}]});
    }
    throw new Error(`Unexpected URL ${url.toString()}`);
  });
  await assert.rejects(
    provider.verifyAndSubscribe({
      accessToken: "token",
      wabaId: "waba-1",
      phoneNumberId: "phone-1",
      businessId: "business-1",
    }),
    /does not belong/,
  );
});

test("templates preserve named parameter bindings for sending", async () => {
  const requests: Array<{ url: URL; init?: RequestInit }> = [];
  const provider = new MetaWhatsappProvider(config, async (input, init) => {
    const url = new URL(input.toString());
    requests.push({url, init});
    if (url.pathname.endsWith("/message_templates")) {
      return jsonResponse({
        data: [
          {
            id: "template-provider-1",
            name: "event_invite",
            parameter_format: "NAMED",
            language: "en_US",
            category: "MARKETING",
            status: "APPROVED",
            components: [
              {
                type: "BODY",
                example: {
                  body_text_named_params: [
                    {param_name: "first_name"},
                    {param_name: "invite_url"},
                  ],
                },
              },
            ],
          },
        ],
      });
    }
    return jsonResponse({messages: [{id: "wamid.1"}]});
  });
  const templates = await provider.listTemplates({
    accessToken: "token",
    wabaId: "waba-1",
  });
  assert.deepEqual(templates[0].variableNames, ["first_name", "invite_url"]);
  assert.deepEqual(
    templates[0].parameterBindings.map((item) => ({
      name: item.variableName,
      position: item.position,
    })),
    [
      {name: "first_name", position: 0},
      {name: "invite_url", position: 1},
    ],
  );
  const sent = await provider.sendTemplate({
    accessToken: "token",
    phoneNumberId: "phone-1",
    toE164: "+919999999999",
    template: templates[0],
    variables: {
      first_name: "Maya",
      invite_url: `${BRAND.web.origin}/events/e1?il=token`,
    },
  });
  assert.equal(sent.providerMessageId, "wamid.1");
  const payload = JSON.parse(String(requests.at(-1)?.init?.body));
  assert.equal(payload.to, "919999999999");
  assert.deepEqual(payload.template.components[0].parameters, [
    {type: "text", text: "Maya", parameter_name: "first_name"},
    {type: "text", text: `${BRAND.web.origin}/events/e1?il=token`,
      parameter_name: "invite_url"},
  ]);
});

test("dynamic URL buttons bind only the provider URL suffix", async () => {
  const requests: Array<{ url: URL; init?: RequestInit }> = [];
  const provider = new MetaWhatsappProvider(config, async (input, init) => {
    const url = new URL(input.toString());
    requests.push({url, init});
    if (url.pathname.endsWith("/message_templates")) {
      return jsonResponse({
        data: [
          {
            id: "template-provider-2",
            name: "event_invite_button",
            language: "en_US",
            category: "MARKETING",
            status: "APPROVED",
            components: [
              {
                type: "BUTTONS",
                buttons: [
                  {
                    type: "URL",
                    url: `${BRAND.web.origin}/invite/{{1}}`,
                    example: ["example-token"],
                  },
                ],
              },
            ],
          },
        ],
      });
    }
    return jsonResponse({messages: [{id: "wamid.2"}]});
  });
  const [template] = await provider.listTemplates({
    accessToken: "token",
    wabaId: "waba-1",
  });
  assert.deepEqual(template.variableNames, ["invite_token"]);
  assert.deepEqual(template.parameterBindings, [
    {
      variableName: "invite_token",
      component: "button",
      position: 0,
      buttonIndex: 0,
    },
  ]);
  await provider.sendTemplate({
    accessToken: "token",
    phoneNumberId: "phone-1",
    toE164: "+919999999999",
    template,
    variables: {invite_token: "v2_invite_token"},
  });
  const payload = JSON.parse(String(requests.at(-1)?.init?.body));
  assert.deepEqual(payload.template.components, [
    {
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{type: "text", text: "v2_invite_token"}],
    },
  ]);
});

test("service-window replies use the free-form text endpoint", async () => {
  let payload: Record<string, unknown> = {};
  const provider = new MetaWhatsappProvider(config, async (_input, init) => {
    payload = JSON.parse(String(init?.body));
    return jsonResponse({messages: [{id: "wamid.reply-1"}]});
  });
  const result = await provider.sendText({
    accessToken: "token",
    phoneNumberId: "phone-1",
    toE164: "+919999999999",
    body: "See you there",
  });

  assert.equal(result.providerMessageId, "wamid.reply-1");
  assert.equal(payload.type, "text");
  assert.deepEqual(payload.text, {
    preview_url: false,
    body: "See you there",
  });
});

test(
  "non-Catch dynamic URL buttons are never treated as invite links",
  async () => {
    const provider = new MetaWhatsappProvider(config, async (input) => {
      const url = new URL(input.toString());
      assert.ok(url.pathname.endsWith("/message_templates"));
      return jsonResponse({
        data: [
          {
            id: "template-provider-3",
            name: "provider_receipt",
            language: "en_US",
            category: "UTILITY",
            status: "APPROVED",
            components: [
              {
                type: "BUTTONS",
                buttons: [
                  {
                    type: "URL",
                    url: "https://tickets.example/receipt/{{1}}",
                    example: ["receipt-1"],
                  },
                ],
              },
            ],
          },
        ],
      });
    });
    const [template] = await provider.listTemplates({
      accessToken: "token",
      wabaId: "waba-1",
    });
    assert.deepEqual(template.variableNames, ["button_1_url"]);
  }
);

test("provider errors are sanitized into typed failures", async () => {
  const provider = new MetaWhatsappProvider(
    config,
    async () =>
      new Response(
        JSON.stringify({
          error: {message: "Template paused", code: 132015},
        }),
        {status: 400},
      ),
  );
  await assert.rejects(
    provider.listTemplates({
      accessToken: "token",
      wabaId: "waba-1",
    }),
    (error: unknown) =>
      error instanceof MetaProviderError &&
      error.providerCode === 132015 &&
      error.httpStatus === 400,
  );
});

test("organizer tokens use a pre-provisioned versioned vault", async () => {
  const calls: Array<{method: string; value: unknown}> = [];
  const client = {
    addSecretVersion: async (value: unknown) => {
      calls.push({method: "add", value});
      return [{
        name: "projects/project-1/secrets/ORGANIZER_WHATSAPP_ACCESS_TOKENS/" +
          "versions/7",
      }];
    },
    accessSecretVersion: async (value: unknown) => {
      calls.push({method: "access", value});
      return [{payload: {data: Buffer.from(JSON.stringify({
        schema: "catch.organizer-whatsapp-token/v1",
        organizerId: "organizer-1",
        connectionId: "connection-1",
        accessToken: "token-1",
      }))}}];
    },
    disableSecretVersion: async (value: unknown) => {
      calls.push({method: "disable", value});
      return [{}];
    },
  };
  const originalProjectId = process.env.GCLOUD_PROJECT;
  process.env.GCLOUD_PROJECT = "project-1";
  try {
    const store = new OrganizerTokenStore(
      client as never,
      "ORGANIZER_WHATSAPP_ACCESS_TOKENS",
    );
    const resource = await store.store({
      organizerId: "organizer-1",
      connectionId: "connection-1",
      accessToken: "token-1",
    });
    assert.equal(
      resource,
      "projects/project-1/secrets/ORGANIZER_WHATSAPP_ACCESS_TOKENS/versions/7",
    );
    assert.equal(await store.access(resource), "token-1");
    await store.disable(resource);
    assert.deepEqual(calls.map((call) => call.method), [
      "add", "access", "disable",
    ]);
    const addRequest = calls[0].value as {
      parent: string;
      payload: {data: Buffer};
    };
    assert.equal(
      addRequest.parent,
      "projects/project-1/secrets/ORGANIZER_WHATSAPP_ACCESS_TOKENS",
    );
    assert.deepEqual(
      JSON.parse(addRequest.payload.data.toString("utf8")),
      {
        schema: "catch.organizer-whatsapp-token/v1",
        organizerId: "organizer-1",
        connectionId: "connection-1",
        accessToken: "token-1",
      },
    );
  } finally {
    if (originalProjectId === undefined) {
      delete process.env.GCLOUD_PROJECT;
    } else {
      process.env.GCLOUD_PROJECT = originalProjectId;
    }
  }
});

test("native replies keep approved labels and provider slots", async () => {
  let sent: TemplateRequest = {};
  const provider = new MetaWhatsappProvider(config, async (input, init) => {
    if (input.toString().includes("/message_templates")) {
      assert.ok(input.toString().includes("parameter_format"));
      return jsonResponse({data: [{
        id: "123", name: "event_update", language: "en", category: "UTILITY",
        status: "APPROVED", parameter_format: "NAMED", components: [
          {type: "HEADER", format: "TEXT", example: {
            header_text_named_params: [{param_name: "event_name"}],
          }},
          {type: "BUTTONS", buttons: [
            {type: "URL", text: "View update", url: BRAND.web.origin},
            {type: "QUICK_REPLY", text: "Joining later"},
            {type: "QUICK_REPLY", text: "Need help"},
          ]},
        ],
      }]});
    }
    assert.equal(init?.redirect, "error");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer t");
    sent = JSON.parse(String(init?.body));
    return jsonResponse({messages: [{id: "wamid.123"}]});
  }, () => 100);
  const [template] = await provider.listTemplates({
    accessToken: "t", wabaId: "123",
  });
  assert.equal(template.parameterFormat, "NAMED");
  assert.deepEqual(template.buttonLabels,
    ["View update", "Joining later", "Need help"]);
  await provider.sendTemplate({
    ...sendInput, template, variables: {event_name: " Evening crawl "},
    deadline: 200, callbackData: "correlation-only-1",
    quickReplyPayloads: [
      {buttonIndex: 2, label: "Need help", payload: "reply-2"},
      {buttonIndex: 1, label: "Joining later", payload: "reply-1"},
    ],
  });
  assert.equal(sent.biz_opaque_callback_data, "correlation-only-1");
  assert.deepEqual(sent.template?.components, [
    {type: "header", parameters: [{type: "text", text: " Evening crawl ",
      parameter_name: "event_name"}]},
    {type: "button", sub_type: "quick_reply", index: "2",
      parameters: [{type: "payload", payload: "reply-2"}]},
    {type: "button", sub_type: "quick_reply", index: "1",
      parameters: [{type: "payload", payload: "reply-1"}]},
  ]);
});

test("invalid native maps and missing metadata never dispatch", async () => {
  let calls = 0;
  const provider = new MetaWhatsappProvider(config, async () => {
    calls++;
    return jsonResponse({messages: [{id: "unexpected"}]});
  });
  const replies = [
    {buttonIndex: 0, label: "Joining later", payload: "r1"},
    {buttonIndex: 1, label: "Need help", payload: "r2"},
  ];
  for (const quickReplyPayloads of [
    [], replies.slice(0, 1), [...replies, replies[0]],
    [replies[0], replies[0]],
    [replies[0], {...replies[1], label: "Changed action"}],
    [replies[0], {...replies[1], buttonIndex: 2}],
    [replies[0], {...replies[1], buttonIndex: 0.5}],
    [replies[0], {...replies[1], payload: "r1"}],
    [replies[0], {...replies[1], payload: "x".repeat(1025)}],
  ]) {
    await assert.rejects(provider.sendTemplate({
      ...sendInput, template: replyTemplate, variables: {}, quickReplyPayloads,
    }));
  }
  for (const template of [
    {...replyTemplate, buttonLabels: undefined},
    {...replyTemplate, buttonLabels: [null, "Need help"]},
    {...replyTemplate, buttonKinds: ["URL", "QUICK_REPLY"] as const},
    {...replyTemplate, parameterFormat: "UNKNOWN", parameterBindings: [{
      variableName: "name", component: "body", position: 0, buttonIndex: null,
    }]},
  ]) {
    await assert.rejects(provider.sendTemplate({
      ...sendInput, template: template as MetaTemplateSnapshot,
      variables: {name: "Maya"}, quickReplyPayloads: replies,
    }));
  }
  assert.equal(calls, 0);
});

test("positional header variables stay positional and legacy data works",
  async () => {
    let sent: TemplateRequest = {};
    const provider = new MetaWhatsappProvider(config, async (input, init) => {
      if (input.toString().includes("/message_templates")) {
        return jsonResponse({data: [{id: "1", name: "test", language: "en",
          parameter_format: "POSITIONAL", components: [
            {type: "HEADER", format: "TEXT",
              example: {header_text: ["Evening"]}},
            {type: "BODY", example: {body_text: [["Maya", "8pm"]]}},
          ],
        }]});
      }
      sent = JSON.parse(String(init?.body));
      return jsonResponse({messages: [{id: "wamid.p"}]});
    });
    const [template] = await provider.listTemplates({
      accessToken: "t", wabaId: "1",
    });
    assert.deepEqual(template.variableNames, ["header_1", "body_1", "body_2"]);
    for (const parameterFormat of ["POSITIONAL", undefined] as const) {
      await provider.sendTemplate({...sendInput,
        template: {...template, parameterFormat},
        variables: {header_1: "Evening", body_1: "Maya", body_2: "8pm"},
      });
      assert.deepEqual(sent.template?.components, [
        {type: "header", parameters: [{type: "text", text: "Evening"}]},
        {type: "body", parameters: [{type: "text", text: "Maya"},
          {type: "text", text: "8pm"}]},
      ]);
    }
  });

test("the deadline is checked after rendering and before any network I/O",
  async () => {
    let now = 100;
    let calls = 0;
    const provider = new MetaWhatsappProvider(config, async () => {
      calls++;
      return jsonResponse({messages: [{id: "unexpected"}]});
    }, () => now);
    const template = {...replyTemplate, parameterBindings: [{
      variableName: "name", component: "body" as const,
      position: 0, buttonIndex: null,
    }]};
    await assert.rejects(provider.sendTemplate({...sendInput, template,
      variables: {get name() {
        now = 200; return "Maya";
      }}, deadline: 200,
    }), (error: unknown) => error instanceof MetaProviderError &&
      error.disposition === "requestNotSent");
    for (const deadline of [200, NaN, Infinity, 199.5]) {
      await assert.rejects(provider.sendText({...sendInput, body: "Hi",
        deadline}), (error: unknown) => error instanceof MetaProviderError &&
        error.disposition === "requestNotSent");
    }
    assert.equal(calls, 0);
  });

test("transport and body failures stay uncertain and redact provider data",
  async () => {
    for (const fetchImpl of [
      async () => {
        throw new Error("secret-token-and-phone");
      },
      async () => new Response("secret-token-and-phone", {status: 502}),
      async () => new Response("[]"),
      async () => jsonResponse({error: {
        message: "secret-token-and-phone", code: 132015,
      }}),
      async () => jsonResponse({messages: []}),
      async () => jsonResponse({messages: [{id: "x"}, {id: "y"}]}),
      async () => jsonResponse({messages: [{id: "x".repeat(513)}]}),
      async () => new Response(new ReadableStream({start(controller) {
        controller.error(new Error("secret-token-and-phone"));
      }})),
    ]) {
      let calls = 0;
      const provider = new MetaWhatsappProvider(config, async (_i, init) => {
        calls++;
        assert.equal(init?.redirect, "error");
        return fetchImpl();
      });
      await assert.rejects(provider.sendText({...sendInput, body: "Hi"}),
        (error: unknown) => error instanceof MetaProviderError &&
          error.disposition === "outcomeUnknown" &&
          !JSON.stringify(error).includes("secret-token-and-phone") &&
          !error.message.includes("secret-token-and-phone"));
      assert.equal(calls, 1);
    }
  });

test("oversized responses cancel their reader and never retry", async () => {
  let cancelled = 0;
  let calls = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new Uint8Array(8193));
    },
    cancel() {
      cancelled++;
    },
  });
  const provider = new MetaWhatsappProvider(config, async () => {
    calls++;
    return new Response(stream);
  });
  await assert.rejects(provider.sendText({...sendInput, body: "Hi"}),
    /Invalid Meta response/);
  assert.equal(calls, 1);
  assert.equal(cancelled, 1);
  assert.equal(stream.locked, false);
});

test("unsafe paths, recipients and callbacks cannot dispatch", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls++;
    return jsonResponse({messages: [{id: "unexpected"}]});
  };
  const provider = new MetaWhatsappProvider(config, fetchImpl);
  for (const toE164 of ["919999999999", "+919999999999\n", "+91 9999999999"]) {
    await assert.rejects(provider.sendText({...sendInput, toE164, body: "Hi"}),
      (e: unknown) => e instanceof MetaProviderError &&
        e.disposition === "requestNotSent");
  }
  for (const callbackData of ["", " ", "x".repeat(513)]) {
    await assert.rejects(provider.sendTemplate({...sendInput,
      template: replyTemplate, variables: {}, callbackData}),
    (e: unknown) => e instanceof MetaProviderError &&
      e.disposition === "requestNotSent");
  }
  const unsafe = new MetaWhatsappProvider({...config,
    graphVersion: "v23.0/../../../other?token=secret"}, fetchImpl);
  await assert.rejects(unsafe.exchangeAuthorizationCode("code"),
    /Invalid Meta request path/);
  assert.equal(calls, 0);
});

test("pagination refuses credential-bearing and external URLs", async () => {
  for (const next of ["https://evil.example/page?token=secret",
    "https://secret@graph.facebook.com/page",
    "https://graph.facebook.com:444/page", "invalid secret URL"]) {
    let calls = 0;
    const provider = new MetaWhatsappProvider(config, async () => {
      calls++;
      return jsonResponse({data: [], paging: {next}});
    });
    await assert.rejects(provider.listTemplates({
      accessToken: "t", wabaId: "1",
    }),
    /^Error: Unsafe Meta pagination URL\.$/);
    assert.equal(calls, 1);
  }
});

test("invalid template inventory cannot masquerade as an empty inventory",
  async () => {
    for (const value of [{}, {data: null}, {data: "not-an-array"}]) {
      const provider = new MetaWhatsappProvider(config, async () =>
        jsonResponse(value));
      await assert.rejects(provider.listTemplates({accessToken: "t",
        wabaId: "1"}), /Invalid Meta template inventory/);
    }
  });

test("bound vault reads reject another owner, aliases and raw legacy tokens",
  async () => {
    let credential: unknown = {schema: "catch.organizer-whatsapp-token/v1",
      organizerId: "o1", connectionId: "c1", accessToken: "secret-token"};
    let calls = 0;
    const client = {accessSecretVersion: async () => {
      calls++;
      return [{payload: {data: Buffer.from(typeof credential === "string" ?
        credential : JSON.stringify(credential))}}];
    }};
    const store = new OrganizerTokenStore(client as never, "VAULT",
      new SecretVersionReferenceGuard(() => "p1"));
    const params = {versionResource: "projects/p1/secrets/VAULT/versions/7",
      organizerId: "o1", connectionId: "c1"};
    assert.equal(await store.accessBound(params), "secret-token");
    for (const overrides of [
      {organizerId: "o2"}, {connectionId: "c2"},
      {versionResource: "projects/p1/secrets/VAULT/versions/latest"},
      {versionResource: "projects/other-project/secrets/VAULT/versions/7"},
      {versionResource: "projects/p1/secrets/OTHER/versions/7"},
      {versionResource: params.versionResource + "\n"},
    ]) {
      await assert.rejects(store.accessBound({...params, ...overrides}),
        /^Error: Organizer sender credential unavailable\.$/);
    }
    assert.equal(calls, 3);
    for (credential of ["legacy-token", "x".repeat(8193),
      {...credential as object, schema: "unknown"},
      {...credential as object, extra: "secret-token"},
    ]) {
      await assert.rejects(store.accessBound(params),
        /^Error: Organizer sender credential unavailable\.$/);
    }
    const failing = new OrganizerTokenStore({accessSecretVersion: async () => {
      throw new Error("secret-token");
    }} as never, "VAULT", new SecretVersionReferenceGuard(() => "p1"));
    await assert.rejects(failing.accessBound(params),
      /^Error: Organizer sender credential unavailable\.$/);
  });

const sendInput = {accessToken: "t", phoneNumberId: "123",
  toE164: "+919999999999"};
const replyTemplate: MetaTemplateSnapshot = {
  providerTemplateId: "1", name: "event_update", language: "en",
  category: "UTILITY", status: "APPROVED", variableNames: [],
  parameterBindings: [], hasMediaHeader: false,
  parameterFormat: "POSITIONAL", buttonKinds: ["QUICK_REPLY", "QUICK_REPLY"],
  buttonLabels: ["Joining later", "Need help"],
};

interface TemplateRequest {
  template?: {components: unknown[]};
  biz_opaque_callback_data?: string;
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {status: 200});
}

test("legacy reads and disables reject foreign references before I/O",
  async () => {
    const calls: string[] = [];
    const client = {
      accessSecretVersion: async () => {
        calls.push("access");
        return [{payload: {data: Buffer.from("legacy-fake-token")}}];
      },
      disableSecretVersion: async () => {
        calls.push("disable"); return [{}];
      },
    };
    const store = new OrganizerTokenStore(client as never, "VAULT",
      new SecretVersionReferenceGuard(() => "local-project",
        async () => "123456"));
    for (const ref of ["projects/foreign-project/secrets/VAULT/versions/7",
      "projects/654321/secrets/VAULT/versions/7",
      "projects/local-project/secrets/OTHER/versions/7",
      "projects/local-project/secrets/VAULT/versions/latest"]) {
      await assert.rejects(store.access(ref));
      await assert.rejects(store.disable(ref));
    }
    assert.deepEqual(calls, []);
    const valid = "projects/123456/secrets/VAULT/versions/7";
    assert.equal(await store.access(valid), "legacy-fake-token");
    await store.disable(valid);
    assert.deepEqual(calls, ["access", "disable"]);
  });
