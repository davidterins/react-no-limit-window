import React, { CSSProperties, useEffect, useRef, useState } from "react";
import Scrollbar from "../scrollbar";
import { IScrollable } from "../virtualized-list/createListComponent";
import AutoSizer from "react-virtualized-auto-sizer";
import { onItemsRenderedCallback, RenderComponent } from "../virtualized-list/listComponent.types";
import DynamicList, { createCache } from "../react-window-dynamic-list";
import { IScrollBar } from "../scrollbar/Scrollbars";
import debounce from "lodash.debounce";

const lineHeight = 20;

interface NoLimitListProps {
  style: CSSProperties;
  itemCount: number;
  defaultItemHeight: number;
  isItemLoaded?: (index: number) => boolean;
  onItemsRendered?: onItemsRenderedCallback;
  ref?: (ref: any) => void;
  setRef?: (ref: any) => void;
  children: RenderComponent<any>;
}

const NoLimitList: React.FC<NoLimitListProps> = (props) => {
  const { style, itemCount, defaultItemHeight, children } = props;
  const cache = createCache();
  const [virtualizedHeight, setVirtHeight] = useState<number>(itemCount * defaultItemHeight);

  // const virtualizedHeight = itemCount * defaultItemHeight;
  let currentWidth = -1;

  const listRef = useRef();
  const virtualizingContainerRef = useRef();
  const ScrollBarRef = useRef();

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

  const handleListResize = debounce(() => {
    console.log("Handling list resize!");
    let scrollbarElement = ScrollBarRef.current as IScrollBar;
    scrollbarElement?.setScrollPos(8000);
    //TODO: Clear caches
    //TODO: Handle height resize

    // if (listRef.current) {
    //   // heightCache.clearCache();
    //   // dynamicOffsetCache.Clear();
    //   // listRef.current.resetAfterIndex(0);
    //   // lazyCacheFill();
    // }
  }, 50);

  return (
    <AutoSizer style={style}>
      {({ height, width }) => {
        const scrollSpeed = (height / virtualizedHeight) * lineHeight;

        if (currentWidth == -1) {
          currentWidth = width;
        }

        if (currentWidth != width) {
          handleListResize();
        }
        return (
          <Scrollbar
            onScroll={handleScroll}
            scrollSpeed={scrollSpeed}
            virtualizedScrollHeight={virtualizedHeight}
            height={height}
            width={width}
            ref={ScrollBarRef}
          >
            <DynamicList
              cache={cache}
              ref={listRef}
              innerRef={virtualizingContainerRef}
              height={height}
              width={width}
              onVirtualizedHeightChanged={(height: number) => {
                // TODO : Maybe set scroll speed here as well.
                let scrollbarElement = ScrollBarRef.current as IScrollBar;
                scrollbarElement?.setScrollHeight(height);
              }}
              isItemLoaded={(index: number) => {
                return props.isItemLoaded(index);
              }}
              shouldItemBeMeasured={(index: number) => {
                return props.isItemLoaded(index);
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
