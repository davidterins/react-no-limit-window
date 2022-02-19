import * as React from "react";
import { CSSProperties, FC } from "react";
import VariableSizeList from "../virtualized-list/VariableSizeList";
import AutoSizer from "react-virtualized-auto-sizer";
import Scrollbar from "../scrollbar";

const layoutStyle: CSSProperties = {
  display: "inline-block",
  width: "100%",
  height: 300,
  background: "blue",
};

const VirtualizedContent: FC = () => {
  const Row = ({ index, style }: any) => <div style={style}>Row {index}</div>;

  return (
    <div style={layoutStyle}>
      <Scrollbar>

      </Scrollbar>
      {/* <VariableSizeList
        height={300}
        width={"100%"}
        itemCount={100}
        itemSize={() => 35}
      >
        {Row}
      </VariableSizeList> */}
    </div>
  );
};

export default VirtualizedContent;
