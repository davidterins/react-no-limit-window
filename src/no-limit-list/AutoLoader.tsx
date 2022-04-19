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

const heightCache = createHeightCache();

const AutoLoaderList: React.FC<AutoLoaderListProps> = ({ pageCollection }) => {
  
  const [itemCount, setItemCount] = useState<number>(100);
  const scrollToIndex = Math.ceil(itemCount / 2);

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
            setItemCount(itemCount + 10000);
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
            defaultItemHeight={100}
            isItemLoaded={(index) => isItemLo(index)}
            onItemsRendered={onItemsRendered}
            setRef={ref}
          >
            {(args) => RenderItem(args)}
          </NoLimitList>
        )}
      </InfiniteLoader>
    </div>
  );
};

export { AutoLoaderList, AutoLoaderListProps };
