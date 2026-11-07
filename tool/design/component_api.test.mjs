import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {after, before, test} from "node:test";
import {fileURLToPath} from "node:url";
import {collectComponentApi, componentApiProblems} from "./lib/component_api.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const collector = path.join(repo, "tool/design/lib/component_api.dart");
const dartArguments = [`--packages=${path.join(repo, ".dart_tool/package_config.json")}`, collector, "--root", repo];
let scratch;
let inventory;
let problems;
const source = `
import 'package:flutter/widgets.dart';
typedef Flag = bool;
typedef NullableFlag = Flag?;
typedef Identity<T> = T;
typedef Render<R, A> = R Function(A);
typedef Composition = Identity<Widget>;
typedef Notify = void Function(Widget child);
typedef LegacyNotify(Widget child);
typedef BrokenCycle = BrokenCycle;

class CatchButton extends StatelessWidget {
  const CatchButton({required this.first, this.second = false});
  const CatchButton.expanded({required this.first, this.second = false, NullableFlag? third});
  factory CatchButton.aliases({required Identity<bool> first, required bool second, required bool third}) = CatchButton._;
  const CatchButton._({required bool first, bool second = false, bool third = false});
  final bool first;
  final Flag second;
  @override Widget build(BuildContext context) => const SizedBox();
}
class CatchPrivateButton extends StatelessWidget {
  const CatchPrivateButton._({bool first = false, bool second = false, bool third = false});
  @override Widget build(BuildContext context) => const SizedBox();
}
class CatchSlotRow extends StatelessWidget {
  const CatchSlotRow({required this.child, required this.leading, required this.badSlot, required Widget this._body});
  final Composition child;
  final List<Composition> leading;
  final Identity<List<Composition>> badSlot;
  final Widget _body;
  @override Widget build(BuildContext context) => child;
}
class CatchBuilderRow extends StatelessWidget {
  const CatchBuilderRow({required this.render, required this.itemBuilder, required this.builder, required this.onChange, required this.changed, required this.format, required this.formatBuilder});
  final Render<Widget, Map<String, List<int>>> render;
  final Render<Widget, List<int>> itemBuilder;
  final WidgetBuilder builder;
  final Notify onChange;
  final VoidCallback changed;
  final String Function(int value) format;
  final String Function(int value) formatBuilder;
  @override Widget build(BuildContext context) => builder(context);
}
class CatchInheritedScope extends InheritedWidget {
  const CatchInheritedScope({required super.child, super.key});
  @override bool updateShouldNotify(CatchInheritedScope oldWidget) => false;
}
class CatchFrameworkInput extends StatelessWidget {
  const CatchFrameworkInput({required this.validator, required this.onValidate,
    required this.counter, required this.counterBuilder,
    required this.tapOutside, required this.onTapOutside,
    required this.contextMenu, required this.contextMenuBuilder});
  final FormFieldValidator<String> validator;
  final FormFieldValidator<String> onValidate;
  final InputCounterWidgetBuilder counter;
  final InputCounterWidgetBuilder counterBuilder;
  final TapRegionCallback tapOutside;
  final TapRegionCallback onTapOutside;
  final EditableTextContextMenuBuilder contextMenu;
  final EditableTextContextMenuBuilder contextMenuBuilder;
  @override Widget build(BuildContext context) => const SizedBox();
}
class CatchParentRow<T extends Widget> extends StatelessWidget {
  const CatchParentRow({required this.child});
  const CatchParentRow.content(this.child);
  final T child;
  @override Widget build(BuildContext context) => child;
}
class CatchChildRow extends CatchParentRow<Widget> {
  const CatchChildRow({required super.child});
  const CatchChildRow.named(super.child) : super.content();
}
class CatchGenericRow<T extends Widget> extends StatelessWidget {
  const CatchGenericRow({required this.badSlot});
  final T badSlot;
  @override Widget build(BuildContext context) => badSlot;
}
abstract interface class CatchRail implements PreferredSizeWidget {}
abstract interface class CatchNestedRail implements CatchRail {}
abstract interface class CatchPageOwner implements Widget {}
abstract interface class CatchData {}
class _PrivateWidget extends StatelessWidget {
  @override Widget build(BuildContext context) => const SizedBox();
}
class CatchInterfaceRow extends StatelessWidget {
  const CatchInterfaceRow({required this.primaryRail, required this.masthead,
    required this.page, required this.wrapper, required this.actions,
    required this.data});
  final CatchRail primaryRail;
  final CatchNestedRail masthead;
  final CatchPageOwner page;
  final _PrivateWidget wrapper;
  final List<CatchNestedRail> actions;
  final CatchData data;
  @override Widget build(BuildContext context) => page;
}
abstract class CatchImplementedRow implements CatchNestedRail {
  const CatchImplementedRow({required Widget badSlot});
}
class CatchGenericButton<T> extends StatelessWidget {
  const CatchGenericButton({required this.first, required this.second, required this.third});
  final T first;
  final T second;
  final T third;
  @override Widget build(BuildContext context) => const SizedBox();
}
class CatchInheritedButton extends CatchGenericButton<bool> {
  const CatchInheritedButton({required super.first, required super.second, required super.third});
}
class CatchUnknownRow extends StatelessWidget {
  const CatchUnknownRow({required this.value, required BrokenCycle cycle});
  final dynamic value;
  @override Widget build(BuildContext context) => const SizedBox();
}
class CatchButtonLabel extends StatelessWidget {
  const CatchButtonLabel();
  @override Widget build(BuildContext context) => const SizedBox();
}
enum CatchButtonVariant { primary }
enum CatchButtonLabelSize { small }
enum CatchButtonShape { circle }
enum CatchInventedVariant { defaultValue }
// enum CatchFakeShape { square }
// class CatchFakeButton extends StatelessWidget {}
const fixtureText = 'class CatchTextButton extends StatelessWidget {}';
`;

before(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "catch-component-api-"));
  const file = path.join(scratch, "fixture.dart");
  fs.writeFileSync(file, source);
  inventory = JSON.parse(execFileSync("dart", [...dartArguments, "--files", file], {cwd: repo, encoding: "utf8"}));
  problems = componentApiProblems(inventory);
});
after(() => fs.rmSync(scratch, {recursive: true, force: true}));
const forSymbol = (symbol, rule) => problems.filter((row) => row.symbol === symbol && (!rule || row.rule === rule));

test("collects named and factory APIs while ignoring private constructors", () => {
  const row = inventory.classes.find((entry) => entry.name === "CatchButton");
  assert.deepEqual(row.constructors.map((entry) => entry.name), ["", "expanded", "aliases"]);
  assert.deepEqual(forSymbol("CatchButton", "boolean-count").map((entry) => entry.constructor), ["expanded", "aliases"]);
  assert.deepEqual(forSymbol("CatchPrivateButton"), []);
});

test("field formals and nullable generic aliases cannot conceal boolean options", () => {
  assert.match(forSymbol("CatchButton", "boolean-count")[0].message, /first, second, third/u);
  assert.equal(forSymbol("CatchButton", "boolean-count").length, 2);
});

test("enforces slots through nested collection aliases and exposes private field formal names", () => {
  assert.deepEqual(forSymbol("CatchSlotRow").map((row) => [row.rule, row.parameter]), [["slot", "badSlot"]]);
  const params = inventory.classes.find((row) => row.name === "CatchSlotRow").constructors[0].parameters;
  assert.equal(params.at(-1).name, "body");
  assert.equal(params.at(-1).field, "_body");
});

test("distinguishes Widget-returning builders from callbacks with Widget arguments", () => {
  assert.deepEqual(forSymbol("CatchBuilderRow").map((row) => [row.rule, row.parameter]), [
    ["builder", "render"], ["callback", "changed"], ["function", "format"],
  ]);
});

test("reads installed SDK inherited child signatures without copying them into policy", () => {
  assert.ok(inventory.externalClasses.some((row) => row.name === "InheritedWidget"));
  assert.ok(inventory.externalAliases.some((row) => row.name === "ValueChanged"));
  assert.deepEqual(forSymbol("CatchInheritedScope"), []);
});

test("reads callback and builder aliases across installed Flutter libraries", () => {
  for (const name of ["FormFieldValidator", "InputCounterWidgetBuilder", "TapRegionCallback", "EditableTextContextMenuBuilder"]) {
    assert.ok(inventory.externalAliases.some((row) => row.name === name), name);
  }
  assert.deepEqual(forSymbol("CatchFrameworkInput").map((row) => [row.rule, row.parameter]), [
    ["function", "validator"], ["builder", "counter"], ["callback", "tapOutside"], ["builder", "contextMenu"],
  ]);
});

test("missing framework configuration fails instead of silently losing callback coverage", () => {
  const result = spawnSync("dart", [...dartArguments, "--root", scratch, "--files", path.join(scratch, "fixture.dart")], {cwd: repo, encoding: "utf8"});
  assert.equal(result.status, 1, result.stderr);
  assert.ok(JSON.parse(result.stdout).failures.some((message) => message.includes("Package configuration is missing")));
});

test("follows named and positional super formals including generic parent substitutions", () => {
  assert.deepEqual(forSymbol("CatchChildRow"), []);
  assert.equal(forSymbol("CatchInheritedButton", "boolean-count").length, 1);
});

test("a Widget generic bound keeps slot naming enforceable", () => {
  assert.deepEqual(forSymbol("CatchGenericRow").map((row) => [row.rule, row.parameter]), [["slot", "badSlot"]]);
});

test("follows direct and transitive Widget interfaces for typed slots", () => {
  assert.deepEqual(inventory.classes.find((row) => row.name === "CatchNestedRail").interfaces, ["CatchRail"]);
  assert.deepEqual(forSymbol("CatchInterfaceRow").map((row) => [row.rule, row.parameter]), [
    ["slot", "primaryRail"], ["slot", "masthead"], ["slot", "page"], ["slot", "wrapper"],
  ]);
});

test("checks constructors of classes that implement a Widget interface", () => {
  assert.deepEqual(forSymbol("CatchImplementedRow").map((row) => [row.rule, row.parameter]), [["slot", "badSlot"]]);
});

test("dynamic parameters and recursive aliases fail closed", () => {
  assert.deepEqual(forSymbol("CatchUnknownRow").map((row) => [row.rule, row.parameter]), [
    ["parameter-type", "value"], ["parameter-type", "cycle"],
  ]);
});

test("enum axes belong to the longest real owner, not an invented prefix", () => {
  assert.deepEqual(problems.filter((row) => row.rule === "enum-axis").map((row) => row.symbol), [
    "CatchButtonShape", "CatchInventedVariant",
  ]);
});

test("source locations are present and comments or string lookalikes add no declarations", () => {
  assert.ok(problems.every((row) => Number.isInteger(row.line) && row.line > 0 && row.file.endsWith("fixture.dart")));
  assert.ok(!inventory.classes.some((row) => /CatchFake|CatchTextButton/u.test(row.name)));
  assert.equal(inventory.failures.length, 0);
});

test("malformed syntax and class aliases cannot disappear from a successful inventory", () => {
  const file = path.join(scratch, "malformed.dart");
  fs.writeFileSync(file, "class CatchAlias = StatelessWidget with FixtureMixin;\nclass CatchMalformed {");
  const result = spawnSync("dart", [...dartArguments, "--files", file], {cwd: repo, encoding: "utf8"});
  assert.equal(result.status, 1, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.ok(parsed.failures.some((message) => message.includes("class aliases require")));
  assert.ok(parsed.failures.length >= 2);
  assert.ok(componentApiProblems(parsed).every((row) => row.rule === "parse"));
});

test("unknown CLI arguments fail instead of falling back to another inventory", () => {
  const result = spawnSync("dart", [...dartArguments, "--typo", "value"], {cwd: repo, encoding: "utf8"});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown argument/u);
});

test("gate collection fails closed on SDK failure, non-JSON and empty output", () => {
  for (const result of [
    {status: null, error: new Error("SDK missing")},
    {status: 1, stderr: "syntax failure"},
    {status: 0, stdout: "truncated"},
    {status: 0, stdout: JSON.stringify({classes: [], enums: [], failures: []})},
  ]) {
    const inventory = collectComponentApi({repoRoot: repo, run: () => result});
    assert.equal(componentApiProblems(inventory).length, 1);
    assert.match(inventory.failures[0], /Component API collection failed/u);
  }
});
