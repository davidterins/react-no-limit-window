import React, { CSSProperties, useEffect, useRef } from "react";
import Scrollbar from "../scrollbar";
import { IScrollable } from "../virtualized-list/createListComponent";
import VariableSizeList from "../virtualized-list/VariableSizeList";
import AutoSizer from "react-virtualized-auto-sizer";

const itemCount = 50000000;
const itemHeight = 100;
const virtHeight = itemCount * itemHeight;

const layoutStyle: CSSProperties = {
  display: "inline-block",
  width: "100%",
  height: 800,
  background: "gray",
};

interface NoLimitListProps {
  style: CSSProperties;
}

const NoLimitList: React.FC<NoLimitListProps> = (props) => {
  const listRef = useRef<any>();
  // return <div>NO LIMIT WINDOW!</div>;

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
    <AutoSizer style={props.style}>
      {({ height, width }) => {
        const rowHeight = 20;

        if (itemCount > rowHeight) {
        }
        const scrollSpeed = (height / virtHeight) * rowHeight;
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
              itemSize={() => itemHeight}
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
  const rowHeight = itemHeight;

  const rowRef = useRef<any>();
  // console.log("HERE CURRENT");

  const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
  };
  // const rowHeight = getRandomInt(230);

  useEffect(() => {
    if (rowRef.current) {
      // console.log("HERE CURRENT WOOT");
      setRowHeight(index, rowRef.current.clientHeight);
    }
  }, [rowRef]);

  let rend = () => {
    const sectionHeight = 20;
    const numberOfSections = rowHeight / sectionHeight;
    let divs = [];

    for (let i = 1; i <= numberOfSections; i++) {
      divs.push(i);
    }

    return divs.map((sectionNumber) => {
      return (
        <div style={{ height: sectionHeight }}>
          Row: {index} Section: {sectionNumber}
        </div>
      );
    });
  };

  return (
    <div ref={rowRef} style={{ ...style, height: rowHeight }}>
      {rend()}
    </div>
  );
};

const setRowHeight = (index: number, height: number) => {
  if (!rowHeights.has(index)) {
    rowHeights.set(index, height);
  } else {
    rowHeights[index] = height;
  }

  // todo update virtheight
};
const getRowHeight = (index: number) => {
  if (rowHeights.has(index)) {
    return rowHeights[index];
  }
  return 35;
};
