import React, { CSSProperties, useEffect, useRef } from "react";
import Scrollbar from "../scrollbar";
import { IScrollable } from "../virtualized-list/createListComponent";
import VariableSizeList from "../virtualized-list/VariableSizeList";
import AutoSizer from "react-virtualized-auto-sizer";

const itemCount = 100;
const itemHeight = 35;
const virtHeight = itemCount * itemHeight;

const layoutStyle: CSSProperties = {
  display: "inline-block",
  width: "100%",
  height: 300,
  background: "gray",
};

interface NoLimitListProps {}

const NoLimitList: React.FC<NoLimitListProps> = () => {
  const listRef = useRef<any>();

  const handleScroll = (
    clientHeight: number,
    virtualizedScrollHeight: number,
    scrollTop: number
  ) => {
    const scrollableHandle = listRef?.current as IScrollable;
    if (scrollableHandle) {
      scrollableHandle.Scrolla(
        clientHeight,
        virtualizedScrollHeight,
        scrollTop
      );
    }
  };

  return (
    <AutoSizer style={layoutStyle}>
      {({ height, width }) => {
        const scrollSpeed = height / itemCount;
        return (
          <Scrollbar
            onScroll={handleScroll}
            scrollSpeed={scrollSpeed}
            virtualizedScrollHeight={virtHeight}
            height={height}
            width={width}
          >
            <VariableSizeList
              ref={listRef}
              height={height}
              width={width}
              itemCount={itemCount}
              itemSize={() => 35}
            >
              {Row}
            </VariableSizeList>
          </Scrollbar>
        );
      }}
    </AutoSizer>
  );
};

export default NoLimitList;

const rowHeights: Map<number, number> = new Map();

const Row = ({ index, style }: any) => {
  // return <div style={{ ...style }}>Row {index}</div>;
  const rowRef = useRef<any>();
  // console.log("HERE CURRENT");

  const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
  };
  const rowHeight = 35; // getRandomInt(230);

  useEffect(() => {
    if (rowRef.current) {
      // console.log("HERE CURRENT WOOT");
      console.warn(rowRef.current.clientHeight);
      // setRowHeight(index, rowRef.current.clientHeight);
    }
  }, [rowRef]);

  return (
    <div ref={rowRef} style={{ ...style, height: rowHeight }}>
      Row {index}
    </div>
  );
};

const setRowHeight = (index: number, height: number) => {
  if (!rowHeights.has(index)) {
    rowHeights.set(index, height);
  } else {
    rowHeights[index] = height;
  }
};
const getRowHeight = (index: number) => {
  if (rowHeights.has(index)) {
    return rowHeights[index];
  }
  return 35;
};
