import type {Metadata, Viewport} from "next";
import type {ReactNode} from "react";
import siteIcons from "../src/generated/siteIcons.json" with {type: "json"};
import "../src/styles.css";
import "./next.css";

// Generated with the app icons by tool/branding/generate_native_brand_assets.dart.
export const metadata: Metadata = {
  icons: {
    icon: siteIcons.icons.filter((icon) => icon.rel === "icon").map(({href, sizes, type}) => ({url: href, sizes, type})),
    apple: siteIcons.icons.filter((icon) => icon.rel === "apple-touch-icon").map(({href, sizes}) => ({url: href, sizes})),
  },
  manifest: siteIcons.manifest,
};

export const viewport: Viewport = {themeColor: siteIcons.themeColor};

export default function RootLayout({children}: {children: ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
