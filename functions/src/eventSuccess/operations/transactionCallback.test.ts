import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync, readdirSync} from "node:fs";
import {join} from "node:path";
import ts from "typescript";

test("assistance write transactions use the shared callback boundary",
  () => {
    const bypasses: string[] = [];
    const files = readdirSync(__dirname, {encoding: "utf8", recursive: true});
    for (const file of files) {
      if (!file.endsWith(".js") || file.endsWith(".test.js") ||
          /(?:TestFixtures|TestHarness)\.js$/.test(file)) continue;
      const source = ts.createSourceFile(file,
        readFileSync(join(__dirname, file), "utf8"), ts.ScriptTarget.Latest,
        true, ts.ScriptKind.JS);
      const visit = (node: ts.Node) => {
        const direct = ts.isPropertyAccessExpression(node) &&
          node.name.text === "runTransaction";
        const indexed = ts.isElementAccessExpression(node) &&
          ts.isStringLiteral(node.argumentExpression) &&
          node.argumentExpression.text === "runTransaction";
        const call = node.parent;
        const options = call && ts.isCallExpression(call) ?
          call.arguments[1] : null;
        const readOnly = options && ts.isObjectLiteralExpression(options) &&
          options.properties.some((property) =>
            ts.isPropertyAssignment(property) &&
            property.name.getText(source) === "readOnly" &&
            property.initializer.kind === ts.SyntaxKind.TrueKeyword);
        if ((direct || indexed) && !readOnly) {
          const {line} = source.getLineAndCharacterOfPosition(node.getStart());
          bypasses.push(file + ":" + (line + 1));
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    assert.deepEqual(bypasses, [], "Use the bounded assistance adapter");
  });
