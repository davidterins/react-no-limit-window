import React, {
  CSSProperties,
  MutableRefObject,
  useEffect,
  useRef,
} from "react";
import Scrollbar from "../scrollbar";
import { IScrollable } from "../virtualized-list/createListComponent";
import VariableSizeList from "../virtualized-list/VariableSizeList";
import AutoSizer from "react-virtualized-auto-sizer";
import {
  onItemsRenderedCallback,
  RenderComponent,
} from "../virtualized-list/listComponent.types";
import { Row } from "./Row";

const rowHeight = 20;

interface NoLimitListProps {
  style: CSSProperties;
  itemCount: number;
  defaultItemHeight: number;
  onItemsRendered?: onItemsRenderedCallback;
  getItemHeight: (index: number) => number;
  ref?: (ref: any) => void;
  children: RenderComponent<any>;
}

const NoLimitList: React.FC<NoLimitListProps> = (props) => {
  const { style, itemCount, defaultItemHeight, children } = props;

  const virtualizedHeight = itemCount * defaultItemHeight;

  const listRef = useRef();

  const handleScroll = (
    clientHeight: number,
    virtualizedScrollHeight: number,
    scrollTop: number
  ) => {
    const scrollableHandle = listRef?.current as IScrollable;
    if (!scrollableHandle) return;

    scrollableHandle.Scrolla(clientHeight, virtualizedScrollHeight, scrollTop);
  };

  const handleItemsRendered = (args: {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => {
    if (props.onItemsRendered) {
      props.onItemsRendered(args);
    }
  };

  useEffect(() => {
    if (props.ref) {
      props.ref(listRef);
    }
  }, []);

  return (
    <AutoSizer style={style}>
      {({ height, width }) => {
        const scrollSpeed = (height / virtualizedHeight) * rowHeight;
        return (
          <Scrollbar
            onScroll={handleScroll}
            scrollSpeed={scrollSpeed}
            virtualizedScrollHeight={virtualizedHeight}
            height={height}
            width={width}
          >
            <VariableSizeList
              ref={listRef}
              height={height}
              width={width}
              itemCount={itemCount}
              itemSize={props.getItemHeight}
              onItemsRendered={handleItemsRendered}
            >
              {children}
            </VariableSizeList>
          </Scrollbar>
        );
      }}
    </AutoSizer>
  );
};

export default NoLimitList;
