import * as React from "react";
import { CSSProperties, FC } from "react";
import VariableSizeList from "../virtualized-list/VariableSizeList";
import AutoSizer from "react-virtualized-auto-sizer";
import Scrollbar from "../scrollbar";
import NoLimitList from "../no-limit-list/NoLimitList";

const layoutStyle: CSSProperties = {
  display: "inline-block",
  width: "100%",
  height: 300,
  background: "gray",
};

const VirtualizedContent: FC = () => {
  return <NoLimitList />;
  // (
  //   <AutoSizer style={layoutStyle}>
  //     {({ height, width }) => {
  //       return <Scrollbar height={height} width={width}></Scrollbar>;
  //     }}
  //   </AutoSizer>
  // );
};

export default VirtualizedContent;
