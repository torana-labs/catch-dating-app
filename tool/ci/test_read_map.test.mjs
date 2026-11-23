import assert from "node:assert/strict";
import test from "node:test";
import {fileReadingTests, packageOf, parseStraceLog, readMapRow, shardOf} from "./test_read_map.mjs";

const LOG = `100 execve("/opt/flutter/bin/cache/dart-sdk/bin/dart", ["dart"], 0x0 /* 1 vars */) = 0
100 clone3({flags=CLONE_VM}, 88 <unfinished ...>
100 <... clone3 resumed>) = 200
200 execve("/opt/flutter/bin/cache/artifacts/engine/linux-x64/flutter_tester", ["flutter_tester"], 0x0) = 0
200 clone(child_stack=0x1, flags=CLONE_THREAD) = 201
201 openat(AT_FDCWD, "/repo/contracts/a.json", O_RDONLY|O_CLOEXEC) = 5
201 openat(AT_FDCWD, "/repo/contracts", O_RDONLY|O_NONBLOCK|O_CLOEXEC|O_DIRECTORY) = 6
201 newfstatat(AT_FDCWD, "lib/x.dart", {st_mode=S_IFREG}, 0) = 0
201 openat(AT_FDCWD, "/repo/missing.txt", O_RDONLY) = -1 ENOENT (No such file or directory)
201 openat(AT_FDCWD, "/etc/hosts", O_RDONLY) = 7
100 clone(child_stack=0x2, flags=SIGCHLD) = 300
300 execve("/opt/flutter/bin/cache/dart-sdk/bin/dartaotruntime", ["dartaotruntime", "frontend_server.dart.snapshot"], 0x0) = 0
300 openat(AT_FDCWD, "/repo/lib/app.dart", O_RDONLY) = 4
100 openat(AT_FDCWD, "/repo/pubspec.yaml", O_RDONLY) = 3
100 openat(AT_FDCWD, "/repo/.dart_tool/package_config.json", O_RDONLY) = 3
100 openat(AT_FDCWD, "/repo/build/unit_test_assets/x", O_RDONLY) = 3
`;

test("each read is attributed to the process kind that made it, threads and children included", () => {
  const map = parseStraceLog(LOG, "/repo");
  assert.deepEqual(map.executables, ["dart", "dartaotruntime", "flutter_tester"]);
  assert.deepEqual(map.runtime, {opened: ["contracts/a.json"], listed: ["contracts"], probed: ["lib/x.dart"],
    missing: ["missing.txt"]});
  assert.deepEqual(map.compiler.opened, ["lib/app.dart"]);
  assert.deepEqual(map.tool.opened, ["pubspec.yaml"]);
});

test("relative paths resolve against the directory the test ran in", () => {
  const log = `201 openat(AT_FDCWD, "test/fixtures/a.json", O_RDONLY) = 5\n` +
    `201 openat(AT_FDCWD, "/repo/contracts/b.json", O_RDONLY) = 6\n`;
  assert.deepEqual(parseStraceLog(log, "/repo", "/repo/apps/host").tool.opened,
    ["apps/host/test/fixtures/a.json", "contracts/b.json"]);
});

test("paths outside the repository and generated state are not inputs", () => {
  const all = Object.values(parseStraceLog(LOG, "/repo")).flatMap((kind) =>
    (Array.isArray(kind) ? [] : Object.values(kind).flat()));
  assert.ok(!all.some((file) => /hosts|\.dart_tool|^build\//u.test(file)), all.join(", "));
  assert.deepEqual(parseStraceLog(`1 openat(AT_FDCWD, "/repository-other/x", O_RDONLY) = 3\n`, "/repo").tool.opened, []);
});

test("an empty or truncated log yields an empty map instead of failing", () => {
  const map = parseStraceLog("", "/repo");
  assert.deepEqual(map.runtime, {opened: [], listed: [], probed: [], missing: []});
  // A log cut off inside a path drops that one call.
  assert.deepEqual(parseStraceLog("201 openat(AT_FDCWD, \"/repo/a", "/repo").tool.opened, []);
});

test("root and app test files that read files are traced, sorted and sharded round-robin", () => {
  const sources = {"test/b_test.dart": "import 'dart:io';\n", "test/a_test.dart": "import \"dart:io\";",
    "test/c_test.dart": "import 'package:x/x.dart';", "test/helper.dart": "import 'dart:io';",
    "test/r_test.dart": "import 'package:catch_test_support/repo_file.dart';",
    "apps/host/test/h_test.dart": "import 'package:catch_test_support/repo_file.dart';",
    "apps/host/integration_test/j_test.dart": "import 'dart:io';",
    "packages/p/test/d_test.dart": "import 'dart:io';"};
  const tests = fileReadingTests(Object.keys(sources), (file) => sources[file]);
  assert.deepEqual(tests, ["apps/host/test/h_test.dart", "test/a_test.dart", "test/b_test.dart", "test/r_test.dart"]);
  assert.deepEqual(tests.map(packageOf), ["apps/host", ".", ".", "."]);
  const five = ["1", "2", "3", "4", "5"];
  assert.deepEqual([0, 1, 2].map((index) => shardOf(five, index, 3)), [["1", "4"], ["2", "5"], ["3"]]);
  assert.throws(() => shardOf(five, 3, 3), /shard/u);
});

test("a row keeps the runtime's reads in full and the compiler's separately", () => {
  const row = readMapRow({test: "test/a_test.dart", seconds: 12.345, exit: 0, logBytes: 10,
    map: parseStraceLog(LOG, "/repo")});
  assert.equal(row.seconds, 12.3);
  assert.deepEqual(row.runtime.opened, ["contracts/a.json"]);
  assert.deepEqual(row.compiler, {opened: ["lib/app.dart"], listed: []});
  assert.equal(row.toolOpened, 1);
});
