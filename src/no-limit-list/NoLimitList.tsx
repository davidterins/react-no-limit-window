import React, { CSSProperties, useEffect, useRef } from "react";
import Scrollbar from "../scrollbar";
import { IScrollable } from "../virtualized-list/createListComponent";
import VariableSizeList from "../virtualized-list/VariableSizeList";
import AutoSizer from "react-virtualized-auto-sizer";
import {
  onItemsRenderedCallback,
  RenderComponent,
} from "../virtualized-list/listComponent.types";
import DynamicList, { createCache } from "../react-window-dynamic-list";

const lineHeight = 20;

interface NoLimitListProps {
  style: CSSProperties;
  itemCount: number;
  defaultItemHeight: number;
  shouldItemBeMeasured?: (index: number) => boolean;
  onItemsRendered?: onItemsRenderedCallback;
  ref?: (ref: any) => void;
  setRef?: (ref: any) => void;
  children: RenderComponent<any>;
}

const NoLimitList: React.FC<NoLimitListProps> = (props) => {
  const { style, itemCount, defaultItemHeight, children } = props;
  const cache = createCache();

  const virtualizedHeight = itemCount * defaultItemHeight;
  const listRef = useRef();
  const virtualizingContainerRef = useRef();

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
    props.setRef(listRef);
  }, []);

  return (
    <AutoSizer style={style}>
      {({ height, width }) => {
        const scrollSpeed = (height / virtualizedHeight) * lineHeight;

        return (
          <Scrollbar
            onScroll={handleScroll}
            scrollSpeed={scrollSpeed}
            virtualizedScrollHeight={virtualizedHeight}
            height={height}
            width={width}
          >
            <DynamicList
              cache={cache}
              ref={listRef}
              innerRef={virtualizingContainerRef}
              height={height}
              width={width}
              shouldItemBeMeasured={(index: number) => {
                return props.shouldItemBeMeasured(index);
              }}
              itemCount={itemCount}
              onItemsRendered={handleItemsRendered}
            >
              {children}
            </DynamicList>
          </Scrollbar>
        );
      }}
    </AutoSizer>
  );
};

export default NoLimitList;
