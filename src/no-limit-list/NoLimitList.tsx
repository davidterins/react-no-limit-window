import React, {
  CSSProperties,
  useEffect,
  useRef,
  useState,
} from "react";
import Scrollbar from "../scrollbar";
import { IListView } from "../virtualized-list/createListComponent";
import AutoSizer from "react-virtualized-auto-sizer";
import {
  onItemsRenderedCallback,
  RenderComponent,
} from "../virtualized-list/listComponent.types";
import DynamicList from "../react-window-dynamic-list";
import { IScrollBar } from "../scrollbar/Scrollbars";
import debounce from "lodash.debounce";
import HeightCache from "../react-window-dynamic-list/cache";
import { DynamicOffsetCache } from "../react-window-dynamic-list/DynamicOffsetCache";

const lineHeight = 20;

export const createHeightCache = (knownSizes = {}) =>
  new HeightCache(knownSizes);
const createOffsetCache = () => new DynamicOffsetCache();

interface NoLimitListProps {
  style: CSSProperties;
  itemCount: number;
  heightCache: HeightCache;
  defaultItemHeight: number;
  scrollToIndex?: number;
  isItemLoaded?: (index: number) => boolean;
  onItemsRendered?: onItemsRenderedCallback;
  ref?: (ref: any) => void;
  setRef?: (ref: any) => void;
  children: RenderComponent<any>;
}

const NoLimitList: React.FC<NoLimitListProps> = (props) => {
  const {
    style,
    itemCount,
    heightCache,
    defaultItemHeight,
    scrollToIndex,
    children,
  } = props;
  let currentWidth = -1;
  let currentHeight = -1;
  // const heightCache = createHeightCache();
  // const offsetCache = createOffsetCache();
  const offsetCache = useRef(createOffsetCache()).current;
  // const offsetCache = offsetCacheRef.current;
  const initialScrollOffset = getOffsetForIndex(
    scrollToIndex,
    heightCache,
    offsetCache
  );
  let lastRenderedIndices: number[] = [];

  const [initialScroll, setInitialScroll] =
    useState<{
      clientHeight: number;
      virtualizedScrollHeight: number;
      scrollTop: number;
    }>();

  const getItemHeight = (index: number) => {
    let itemHeight = heightCache.get(index);
    return itemHeight;
  };

  const getItemOffset = (index: number) => {
    let itemHeight = heightCache.get(index);
    let itemOffsetTop = offsetCache.getItemOffset(index, itemHeight);
    return itemOffsetTop;
  };

  const getTotalHeight = (itemCount: number) => {
    if (itemCount > 0) {
      let lastItemHeight = getItemHeight(itemCount - 1);
      let lastItemOffset = getItemOffset(itemCount - 1);
      let lastItemOffsetEnd = lastItemOffset + lastItemHeight;
      return lastItemOffsetEnd;
    }
    return itemCount * defaultItemHeight;
  };

  let virtualizedHeight = getTotalHeight(itemCount);
  // const [virtualizedHeight, setVirtualizedHeight] = useState<number>(
  //   getTotalHeight(itemCount)
  // );

  const listRef = useRef();
  const virtualizingContainerRef = useRef();
  const ScrollBarRef = useRef();
  const mounted = useRef(false);

  const handleScroll = (
    clientHeight: number,
    virtualizedScrollHeight: number,
    scrollTop: number
  ) => {
    const listView = listRef?.current as IListView;
    if (!listView && !initialScroll) {
      // The list ref may not have been mounted yet before this is called,
      // which is needed to call the scroll method on the list view. So set the state
      // of this component to make sure it gets loaded, before performing an inital scroll.
      setInitialScroll({ clientHeight, virtualizedScrollHeight, scrollTop });
    } else {
      listView.SetViewPort(clientHeight, virtualizedScrollHeight, scrollTop);
    }
  };

  useEffect(() => {
    if (initialScroll) {
      const { clientHeight, virtualizedScrollHeight, scrollTop } =
        initialScroll;
      const listView = listRef?.current as IListView;
      listView.SetViewPort(clientHeight, virtualizedScrollHeight, scrollTop);
    }
  }, [initialScroll]);

  const handleItemsRendered = (args: {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => {
    const { visibleStartIndex, visibleStopIndex } = args;
    if (props.onItemsRendered) {
      lastRenderedIndices = [];
      for (let i = visibleStartIndex; i <= visibleStopIndex; i++) {
        lastRenderedIndices.push(i);
      }
      props.onItemsRendered(args);
    }
  };

  useEffect(() => {
    props.setRef(listRef);
    if (!mounted.current) {
      mounted.current = true;
    } else {
    }
  });

  const handleListResize = (
    cacheReset: boolean,
    lastRenderedIndices: number[]
  ) => {
    const k = debounce(() => {
      let scrollbarElement = ScrollBarRef.current as IScrollBar;
      if (cacheReset) {
        heightCache.clearCache();
        offsetCache.Clear();
      }

      if (lastRenderedIndices.length > 0) {
        const firstRenderedIndex = lastRenderedIndices[0];
        const targetOffset = getOffsetForIndex(
          firstRenderedIndex,
          heightCache,
          offsetCache
        );
        scrollbarElement?.setScrollPos(targetOffset);
      }
    }, 50);
    k();
  };

  return (
    <AutoSizer style={style}>
      {({ height, width }) => {
        // return <div style={{ height, width, background: "blue" }}></div>;
        const scrollSpeed = (height / virtualizedHeight) * lineHeight;

        if (currentWidth == -1) {
          currentWidth = width;
        }
        if (currentHeight == -1) {
          currentHeight = height;
        }

        if (currentWidth != width) {
          handleListResize(true, lastRenderedIndices);
        }
        if (currentHeight != height) {
          handleListResize(false, lastRenderedIndices);
        }
        return (
          <Scrollbar
            onScroll={handleScroll}
            scrollToOffset={initialScrollOffset}
            scrollSpeed={scrollSpeed}
            virtualizedScrollHeight={virtualizedHeight}
            height={height}
            width={width}
            ref={ScrollBarRef}
          >
            <DynamicList
              heightCache={heightCache}
              offsetCache={offsetCache}
              ref={listRef}
              innerRef={virtualizingContainerRef}
              height={height}
              width={width}
              onVirtualizedHeightChanged={(height: number) => {
                // TODO : Maybe set scroll speed here as well.
                let scrollbarElement = ScrollBarRef.current as IScrollBar;
                scrollbarElement?.setScrollHeight(height);
                // setVirtualizedHeight(height);
              }}
              isItemLoaded={(index: number) => {
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

const getOffsetForIndex = (
  index: number,
  heightCache: HeightCache,
  offsetCache: DynamicOffsetCache
): number => {
  let itemHeight = heightCache.get(index);
  let offset = offsetCache.getItemOffset(index, itemHeight);
  return offset;
};
