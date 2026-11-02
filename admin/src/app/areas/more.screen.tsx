import {CatchIndexRow, CatchPaneLayout, CatchWorkspaceHeader} from "@catch/web-ui";
import type {AdminAreaRender} from "../adminAreaKit";

const render: AdminAreaRender = ({navigate, navigation}) => (
  <>
    <CatchWorkspaceHeader title="More" />
    <CatchPaneLayout
      main={navigation.filter((item) => item.value !== "more").map((item) => (
        <CatchIndexRow
          href={item.href}
          key={item.value}
          onTap={() => navigate(item.href ?? "/")}
          subtitle={item.section}
          title={item.label}
        />
      ))}
      pattern="reading"
    />
  </>
);

export default render;
