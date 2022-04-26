import React, { forwardRef, useEffect } from "react";
import VariableSizeList from "../virtualized-list/VariableSizeList";
import HeightCache from "./cache";
import useShareForwardedRef from "./utils/useShareForwardRefs";
import measureElement, { destroyMeasureLayer } from "./asyncMeasurer";
import { defaultMeasurementContainer } from "./defaultMeasurementContainer";
import { DynamicOffsetCache, MeasuredItem } from "./DynamicOffsetCache";
import {
  ItemMeasurementMeta,
  Props,
} from "../virtualized-list/listComponent.types";

/**
 * A virtualized list which handles item of varying sizes.
 * Read the implementation section in the README for additional information on the general algorithm.
 */
const DynamicList = (
  {
    heightCache,
    offsetCache,
    children,
    data,
    itemCount,
    itemData,
    height,
    width,
    isItemLoaded,
    onItemsRendered,
    onVirtualizedHeightChanged,
    ...variableSizeListProps
  }: any,
  ref: any
) => {
  const hCache = heightCache as HeightCache;
  const oCache = offsetCache as DynamicOffsetCache;
  const listRef = useShareForwardedRef(ref);

  /**
   * Measure a specific item.
   * @param {number} index The index of the item in the data array.
   */
  const measureIndex = (index: number) => {
    const renderItem = (children as any)({ index, data: itemData });
    const ItemContainer = (
      <div id="item-container" style={{ overflow: "auto" }}>
        {renderItem}
      </div>
    );

    const MeasurementContainer = defaultMeasurementContainer({
      style: {
        width,
        height,
        // overflowY: "scroll",
      },
      children: ItemContainer,
    });

    const { height: measuredHeight } = measureElement(
      MeasurementContainer,
      false
    );
    return measuredHeight;
  };

  /**
   * Initiate cache filling and handle cleanup of measurement layer.
   * In addition cache the old implementation of the overridden functions.
   */
  useEffect(() => {
    if (listRef.current) {
      listRef.current._resetAfterIndex = listRef.current.resetAfterIndex;
    }
    return destroyMeasureLayer;
  }, []);

  const handleJITMeasurement = (
    props: Props<any>,
    startIndex: number,
    stopIndex: number
  ): ItemMeasurementMeta[] => {
    // When this function is called the items between startIndex -> stopIndex
    // are just about to be rendered.

    let unmeasuredIndices: number[] = [];

    // 1. Make sure that the indices have measured heights
    for (let i = startIndex; i <= stopIndex; i++) {
      const itemIsLoaded = isItemLoaded(i);
      const uncachedHeight = !hCache.has(i);
      if (itemIsLoaded && uncachedHeight) {
        // If an item is loaded and have not yet been measured,
        // then add it to the list of indices to be measured.
        unmeasuredIndices.push(i);
      }
    }

    if (unmeasuredIndices.length == 0) return;

    // 2. Measure the unmeasured items.
    let measuredItems: MeasuredItem[] = unmeasuredIndices.map((index) => {
      let measuredHeight = measureIndex(index); // Item pre-measurement...
      hCache.addHeight({ index, height: measuredHeight });

      let measuredItem: MeasuredItem = {
        index,
        height: measuredHeight,
      };
      return measuredItem;
    });

    // 3. Update offset cache based on the freshly measured items.
    oCache.UpdateOffsets(measuredItems);
  };

  const getItemHeight = (index: number) => {
    let itemHeight = hCache.get(index);
    return itemHeight;
  };

  const getItemOffset = (index: number) => {
    let itemHeight = hCache.get(index);
    let itemOffsetTop = oCache.getItemOffset(index, itemHeight);
    return itemOffsetTop;
  };

  const getTotalHeight = (itemCount: number) => {
    if (itemCount > 0) {
      let lastItemHeight = getItemHeight(itemCount - 1);
      let lastItemOffset = getItemOffset(itemCount - 1);
      let lastItemOffsetEnd = lastItemOffset + lastItemHeight;
      return lastItemOffsetEnd;
    }
    return itemCount * hCache.DefaultItemHeight;
  };

  return (
    <VariableSizeList
      layout="vertical"
      ref={listRef}
      onItemsRendered={(props) => {
        if (itemCount > 0) {
          let totalHeight = getTotalHeight(itemCount);
          // console.log("new total height on rendered", totalHeight);
          onVirtualizedHeightChanged(totalHeight);
        }
        onItemsRendered(props);
      }}
      onJITMeasurement={handleJITMeasurement}
      getItemHeight={getItemHeight}
      getItemOffset={getItemOffset}
      height={height}
      width={width}
      itemCount={itemCount}
      itemData={itemData}
      {...variableSizeListProps}
    >
      {children}
    </VariableSizeList>
  );
};

export default forwardRef(DynamicList);
