// Setup for web-ui's react18 test project: fails the run if an alias or hook
// stopped applying and the tests would silently render with React 19 again.
// It sits inside web-ui so Vite serves it wherever web-ui is checked out.
import {version as reactVersion} from "react";
import {version as reactDomVersion} from "react-dom";

for (const [name, version] of [["react", reactVersion], ["react-dom", reactDomVersion]]) {
  if (!version.startsWith("18.")) {
    throw new Error(`The React 18 test project loaded ${name} ${version}.`);
  }
}
