import type {ComponentProps} from "react";

// The legacy site chrome's wrapper: PublicSiteChrome still renders the old
// header and footer inside it on routes not yet rebuilt on the v2 chrome.
export function ConsumerHome(props: ComponentProps<"div">) { return <div {...props} className="consumer-home" />; }
