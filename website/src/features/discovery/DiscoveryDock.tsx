import {CatchSiteDock} from "@catch/web-ui";
import {discoveryPagesCopy as copy} from "@content/discovery/discoveryPages";
import {whatsappChatHref} from "@content/site";

/** The phone action bar under a discovery page (the kit's KitFooter mbar): the page's plans, and WhatsApp. */
export function DiscoveryDock({label, href, message}: {label: string; href: string; message: string}) {
  return (
    <CatchSiteDock
      label={copy.dock.label}
      primary={{label, href, accent: "pink"}}
      whatsapp={{label: copy.dock.whatsapp, href: whatsappChatHref(message)}}
    />
  );
}
