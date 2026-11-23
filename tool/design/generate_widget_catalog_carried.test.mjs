// A carried file keeps the naming rules of the legacy path it moved from.
import assert from "node:assert/strict";
import test from "node:test";
import {carriedNamingFindings} from "./generate_widget_catalog.mjs";

test("a carried file is named by the rules of the path it came from", () => {
  const widget = {classKind: "widget", visibility: "public", file: "lib/pages/frame/app.dart", name: "MyApp"};
  const symbol = {file: "lib/pages/frame/consumer_bootstrap.dart", kind: "class", name: "CatchConsumerBootstrap", line: 1};
  const uncarried = carriedNamingFindings({carried: new Map(), declarations: [widget], symbolDeclarations: [symbol]});
  assert.deepEqual(uncarried.map(({name}) => name).sort(), ["CatchConsumerBootstrap", "MyApp"]);
  const carried = carriedNamingFindings({
    carried: new Map([
      ["lib/pages/frame/app.dart", "lib/app.dart"],
      ["lib/pages/frame/consumer_bootstrap.dart", "lib/consumer_bootstrap.dart"],
    ]),
    declarations: [widget],
    symbolDeclarations: [symbol],
  });
  assert.deepEqual(carried, []);
  // A carried file whose legacy path had debt keeps it, under its current path.
  const legacy = carriedNamingFindings({
    carried: new Map([["lib/pages/event/event_panel.dart", "lib/events/presentation/event_panel.dart"]]),
    declarations: [{classKind: "widget", visibility: "public", file: "lib/pages/event/event_panel.dart", name: "EventPanel"}],
    symbolDeclarations: [],
  });
  assert.deepEqual(legacy.map(({file, name}) => [file, name]), [["lib/pages/event/event_panel.dart", "EventPanel"]]);
});
