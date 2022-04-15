import * as React from "react";
import { CSSProperties, useEffect } from "react";
import InfiniteLoader from "../infinite-loader";
import { NoLimitList } from "..";
import { IPageCollection } from "../paging/PageCollection";
import { Row } from "./Row";

const listStyle: CSSProperties = {
  display: "inline-block",
  width: "100%",
  height: "100%",
  // height: "600px",
  background: "gray",
};

export interface ListItem {
  content: string;
}

interface AutoLoaderListProps {
  itemCount: number;
  pageCollection: IPageCollection<ListItem>;
}

const AutoLoaderList: React.FC<AutoLoaderListProps> = ({ itemCount, pageCollection }) => {
  const scrollToIndex = Math.ceil(itemCount / 2);

  const RenderItem = ({ index, style }: any, defaultHeight: number) => {
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
    <div style={{ display: "inline-block", width: "90vw", height: "90vh", background: "black" }}>
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
            defaultItemHeight={100}
            isItemLoaded={(index) => isItemLo(index)}
            onItemsRendered={onItemsRendered}
            setRef={ref}
          >
            {(args) => RenderItem(args, 100)}
          </NoLimitList>
        )}
      </InfiniteLoader>
    </div>
  );
};

export { AutoLoaderList, AutoLoaderListProps };
