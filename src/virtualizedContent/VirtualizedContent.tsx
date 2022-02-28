import * as React from "react";
import { CSSProperties, FC } from "react";
import NoLimitList from "../no-limit-list/NoLimitList";

const listStyle: CSSProperties = {
  display: "inline-block",
  width: "100%",
  height: 400,
  background: "gray",
};

const VirtualizedContent: FC = () => {
  return (
    <NoLimitList
      itemCount={100}
      defaultItemHeight={100}
      getItemHeight={(index) => 100}
      style={listStyle}
    />
  );
};

export default VirtualizedContent;
