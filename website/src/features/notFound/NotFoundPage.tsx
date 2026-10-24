import {websiteCopy} from "@content/generated";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {ProcessStatusPanel} from "../../shared/ui/primitives";

export function NotFoundPage() {
  return (
    <>
      <PublicSiteHeader />

      <WebsitePageMain id="top">
        <ProcessStatusPanel
          mark="404"
          eyebrow={websiteCopy["notfoundpage_0340"]}
          title={websiteCopy["notfoundpage_0345"]}
          body={websiteCopy["notfoundpage_0344"]}
          items={[
            {
              title: websiteCopy["notfoundpage_0343"],
              body: websiteCopy["notfoundpage_0336"],
            },
            {
              title: websiteCopy["notfoundpage_0331"],
              body: websiteCopy["notfoundpage_0341"],
            },
            {
              title: websiteCopy["notfoundpage_0338"],
              body: websiteCopy["notfoundpage_0335"],
            },
          ]}
          actions={[
            {href: "/organizers/", label: websiteCopy["notfoundpage_0342"], variant: "primary"},
            {href: "/", label: websiteCopy["notfoundpage_0337"], variant: "secondary"},
            {href: "/host/", label: websiteCopy["notfoundpage_0334"], variant: "secondary"},
          ]}
        />
      </WebsitePageMain>

      <PublicSiteFooter />
    </>
  );
}
