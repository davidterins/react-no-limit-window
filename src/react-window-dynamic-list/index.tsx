import React, { forwardRef, useEffect, useLayoutEffect } from "react";
import VariableSizeList, { VariableSizeProps } from "../virtualized-list/VariableSizeList";
import debounce from "lodash.debounce";
import HeightCache from "./cache";
import useShareForwardedRef from "./utils/useShareForwardRefs";
import measureElement, { destroyMeasureLayer } from "./asyncMeasurer";
import { defaultMeasurementContainer } from "./defaultMeasurementContainer";
import { DynamicOffsetCache, MeasuredItem } from "./DynamicOffsetCache";
import { ItemMeasurementMeta, Props } from "../virtualized-list/listComponent.types";

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
    lazyMeasurement = true,
    recalculateItemsOnResize = { width: true, height: true },
    // measurementContainerElement = defaultMeasurementContainer,
    debug = false,

    ...variableSizeListProps
  }: any,
  ref: any
) => {
  const hCache = heightCache as HeightCache;
  const oCache = offsetCache as DynamicOffsetCache;

  const listRef = useShareForwardedRef(ref);
  const containerResizeDeps = [];

  if (recalculateItemsOnResize.width) {
    containerResizeDeps.push(width);
  }
  if (recalculateItemsOnResize.height) {
    containerResizeDeps.push(height);
  }

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
      style: { width, height, overflowY: "scroll" },
      children: ItemContainer,
    });

    const { height: measuredHeight } = measureElement(MeasurementContainer, debug);
    return measuredHeight;
  };

  /**
   * Measure all of the items in the background.
   * This could be a little tough in the site in the first seconds however it allows
   * fast jumping.
   */
  const lazyCacheFill = () => {
    if (!lazyMeasurement) {
      return;
    }
  };

  const handleListResize = debounce(() => {
    // console.log("Handling list resize!");
    // if (listRef.current) {
    //   heightCache.clearCache();
    //   dynamicOffsetCache.Clear();
    //   listRef.current.resetAfterIndex(0);
    //   lazyCacheFill();
    // }
  }, 50);

  /**
   * Initiate cache filling and handle cleanup of measurement layer.
   * In addition cache the old implementation of the overridden functions.
   */
  useEffect(() => {
    lazyCacheFill();
    if (listRef.current) {
      listRef.current._resetAfterIndex = listRef.current.resetAfterIndex;
    }
    return destroyMeasureLayer;
  }, []);

  /**
   * This component shares the listRef (ref to VariableSizeList) with its users - read useShareForwardRef.js for more
   * info. This sharing comes at a cost - if users call VariableSizeList functions directly we cant adjust accordingly.
   * In order to inject our custom code without effecting our API we added the overriding functionality as seen bellow:
   * resetAfterIndex - Add the clearing of our cache as well as VariableSizeList cache.
   *
   * lazyCacheFill is deliberately not wrapped with useCallback - It isn't expensive to overwrite resetAfterIndex every
   * render and it allows us to make sure that all of the values in lazyCacheFilter are up to date.
   */
  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex = (index, shouldForceUpdate = true) => {
        hCache.clearCache();
        lazyCacheFill();
        listRef.current._resetAfterIndex(index, shouldForceUpdate);
      };
    }
  }, [lazyCacheFill]);

  /**
   * Recalculate items size of the list size has changed.
   */
  useLayoutEffect(() => {
    if (containerResizeDeps.length > 0) {
      handleListResize();
    }
  }, containerResizeDeps);

  /**
   * In case the data length changed we need to reassign the current size to all of the indexes.
   */
  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [itemCount]);

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
    let itemHeight = heightCache.get(index);
    return itemHeight;
  };

  const getItemOffset = (index: number) => {
    let itemHeight = hCache.get(index);
    let itemOffsetTop = oCache.getItemOffset(index, itemHeight);
    return itemOffsetTop;
  };

  return (
    <VariableSizeList
      layout="vertical"
      ref={listRef}
      onItemsRendered={(props) => {
        if (itemCount > 0) {
          let lastItemHeight = getItemHeight(itemCount - 1);
          let lastItemOffset = getItemOffset(itemCount - 1);
          let lastItemOffsetEnd = lastItemOffset + lastItemHeight;
          onVirtualizedHeightChanged(lastItemOffsetEnd);
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
