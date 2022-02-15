import * as React from "react";
import { FC } from "react";
import Scrollbars from "../scrollbar";
import VariableSizeList from "../virtualized-list/VariableSizeList";

const VirtualizedContent: FC = () => {
  const Row = ({ index, style }: any) => <div style={style}>Row {index}</div>;

  return (
    <Scrollbars style={{ background: "gray", width: 500, height: 300 }}>
      <VariableSizeList
        height={300}
        width={500}
        itemCount={100}
        itemSize={() => 35}
      >
        {Row}
      </VariableSizeList>
      {/* <div
        style={{ background: "pink", color: "white", width: 200, height: 400 }}
      >
        HEJ
      </div> */}
    </Scrollbars>
  );
};

export default VirtualizedContent;
