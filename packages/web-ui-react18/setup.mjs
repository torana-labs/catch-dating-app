// Fails the React 18 run if an alias or hook stopped applying and the tests
// would silently render with React 19 again.
import {version as reactVersion} from "react";
import {version as reactDomVersion} from "react-dom";

for (const [name, version] of [["react", reactVersion], ["react-dom", reactDomVersion]]) {
  if (!version.startsWith("18.")) {
    throw new Error(`The React 18 test project loaded ${name} ${version}.`);
  }
}
