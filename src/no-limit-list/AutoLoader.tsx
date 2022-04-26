import * as React from "react";
import { CSSProperties, useEffect, useState } from "react";
import InfiniteLoader from "../infinite-loader";
import { NoLimitList } from "..";
import { IPageCollection } from "../paging/PageCollection";
import { Row } from "./Row";
import { createHeightCache } from "./NoLimitList";

const listStyle: CSSProperties = {
  display: "inline-block",
  width: "100%",
  height: "100%",
  background: "gray",
};

export interface ListItem {
  content: string;
}

interface AutoLoaderListProps {
  itemCount: number;
  pageCollection: IPageCollection<ListItem>;
}

const initialItemCount = 100000;
const defaultItemHeight = 19;
const scrollbarWidth = 10;
const heightCache = createHeightCache(defaultItemHeight);

function renderThumbVertical({ style, ...props }: any) {
  const finalStyle: CSSProperties = {
    ...style,
    cursor: "pointer",
    borderRadius: "inherit",
    // border: "1px solid red",
    backgroundColor: "#FFFFFF30",
  };
  return <div style={finalStyle} {...props} />;
}

function renderTrackVertical({ style, ...props }: any) {
  const finalStyle: CSSProperties = {
    ...style,
    right: 2,
    bottom: 2,
    top: 2,
    width: scrollbarWidth,
    display: "visible",
    borderRadius: 3,
    backgroundColor: "#FFFFFF30",
  };
  return <div style={finalStyle} {...props} />;
}

const AutoLoaderList: React.FC<AutoLoaderListProps> = ({ pageCollection }) => {
  const [itemCount, setItemCount] = useState<number>(initialItemCount);
  // const scrollToIndex = Math.ceil(itemCount / 2);
  const scrollToIndex = Math.ceil(itemCount - 1);

  const RenderItem = ({ index, style }: any) => {
    // let isLoading = !pageCollection.isItemLoaded(index);
    let pageState = pageCollection.getPageState(index);

    let content: {};
    switch (pageState) {
      case "none":
        content = "none...";
        break;
      case "initialized":
        content = "Initialized...";
        break;
      case "requested":
        content = "Requested...";
        break;
      case "loaded":
        let item = pageCollection.getItem(index);
        return Row({ index, style }, 100);
      default:
        break;
    }

    return (
      <div style={style}>
        {index} - {content}
      </div>
    );
  };

  const isItemLo = (index: number) => {
    return pageCollection.isItemLoaded(index);
  };

  const loadMoreIt = (start: number, stop: number) => {
    return pageCollection.loadMoreItems(start, stop);
  };
  return (
    <div
      style={{
        display: "inline-block",
        width: "90vw",
        height: "90vh",
        background: "black",
      }}
    >
      <span>
        <button
          onClick={() => {
            setItemCount(itemCount + 1000000);
          }}
        >
          add
        </button>
        <button
          onClick={() => {
            setItemCount(itemCount - 10);
          }}
        >
          remove{" "}
        </button>
        <h3 style={{ background: "white" }}>{itemCount}</h3>
      </span>
      <InfiniteLoader
        isItemLoaded={isItemLo}
        itemCount={itemCount}
        minimumBatchSize={pageCollection.pageSize}
        loadMoreItems={loadMoreIt}
      >
        {({ onItemsRendered, ref }) => (
          <NoLimitList
            style={listStyle}
            itemCount={itemCount}
            scrollToIndex={scrollToIndex}
            heightCache={heightCache}
            isItemLoaded={(index) => isItemLo(index)}
            onItemsRendered={onItemsRendered}
            setRef={ref}
            scrollbarWidth={scrollbarWidth}
            renderThumbVertical={renderThumbVertical}
            renderTrackVertical={renderTrackVertical}
          >
            {(args) => RenderItem(args)}
          </NoLimitList>
        )}
      </InfiniteLoader>
    </div>
  );
};

export { AutoLoaderList, AutoLoaderListProps };
