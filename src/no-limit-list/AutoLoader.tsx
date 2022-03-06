import * as React from "react";
import { CSSProperties, useEffect } from "react";
import InfiniteLoader from "../infinite-loader";
import { NoLimitList } from "..";
import { IPageCollection } from "../paging/PageCollection";
import { Row } from "./Row";
import { propTypes } from "../scrollbar/Scrollbars/scrollbar.types";
// import { getMeasureLayer } from "../hidden-element/MeasureElement";

const listStyle: CSSProperties = {
  display: "inline-block",
  width: "100%",
  height: "1200px",
  background: "gray",
};

export interface ListItem {
  content: string;
}

interface AutoLoaderListProps {
  itemCount: number;
  pageCollection: IPageCollection<ListItem>;
}

const AutoLoaderList: React.FC<AutoLoaderListProps> = ({
  itemCount,
  pageCollection,
}) => {
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

  const isItemLo = (index) => {
    return pageCollection.isItemLoaded(index);
  };

  const loadMoreIt = (start, stop) => {
    return pageCollection.loadMoreItems(start, stop);
  };
  return (
    <InfiniteLoader
      isItemLoaded={isItemLo}
      itemCount={itemCount}
      loadMoreItems={loadMoreIt}
    >
      {({ onItemsRendered, ref }) => (
        <NoLimitList
          style={listStyle}
          itemCount={itemCount}
          defaultItemHeight={100}
          shouldItemBeMeasured={isItemLo}
          onItemsRendered={onItemsRendered}
          // getItemHeight={(index) => getRowHeight(index)}
          setRef={ref}
        >
          {(args) => RenderItem(args, 100)}
        </NoLimitList>
      )}
    </InfiniteLoader>
  );
};

export { AutoLoaderList, AutoLoaderListProps };
