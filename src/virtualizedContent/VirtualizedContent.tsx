import * as React from "react";
import { FC } from "react";
import Scrollbars from "../scrollbar";

const VirtualizedContent: FC = () => {

    
  return (
    <Scrollbars style={{ background: "gray", width: 500, height: 300 }}>
      <div
        style={{ background: "pink", color: "white", width: 200, height: 400 }}
      >
        HEJ
      </div>
    </Scrollbars>
  );
};

export default VirtualizedContent;
