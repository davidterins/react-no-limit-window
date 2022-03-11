import React, { forwardRef, useEffect, useLayoutEffect } from "react";
// import { VariableSizeList } from "react-window";
import VariableSizeList from "../virtualized-list/VariableSizeList";
import debounce from "lodash.debounce";

import Cache from "./cache";
import useShareForwardedRef from "./utils/useShareForwardRefs";
import measureElement, { destroyMeasureLayer } from "./asyncMeasurer";
import { defaultMeasurementContainer } from "./defaultMeasurementContainer";

/**
 * Create the dynamic list's cache object.
 * @param {Object} knownSizes a mapping between an items id and its size.
 */
export const createCache = (knownSizes = {}) => new Cache(knownSizes);

/**
 * A virtualized list which handles item of varying sizes.
 * Read the implementation section in the README for additional information on the general algorithm.
 */
const DynamicList = (
  {
    children,
    data,
    itemCount,
    itemData,
    height,
    width,
    cache,
    shouldItemBeMeasured,
    lazyMeasurement = true,
    recalculateItemsOnResize = { width: true, height: true },
    measurementContainerElement = defaultMeasurementContainer,
    debug = false,
    ...variableSizeListProps
  },
  ref
) => {
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
  const measureIndex = (index) => {
    const ItemContainer = (
      <div id="item-container" style={{ overflow: "auto" }}>
        {children({ index, data: itemData })}
      </div>
    );

    const MeasurementContainer = measurementContainerElement({
      style: { width, height, overflowY: "scroll" },
      children: ItemContainer,
    });

    const { height: measuredHeight } = measureElement(
      MeasurementContainer,
      debug
    );
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

    for (var i = 0; i < itemCount; i++) {
      if (!shouldItemBeMeasured(i)) {
        return;
      }
      // We use set timeout here in order to execute the measuring in a background thread.
      setTimeout(() => {
        if (!cache.values[i]) {
          const height = measureIndex(i);

          // Double check in case the main thread already populated this id
          if (!cache.values[i]) {
            cache.values[i] = height;
          }
        }
      }, 0);
    }

    // data.forEach(({ id }, index) => {
    //   // We use set timeout here in order to execute the measuring in a background thread.
    //   setTimeout(() => {
    //     if (!cache.values[id]) {
    //       const height = measureIndex(index);

    //       // Double check in case the main thread already populated this id
    //       if (!cache.values[id]) {
    //         cache.values[id] = height;
    //       }
    //     }
    //   }, 0);
    // });
  };

  const handleListResize = debounce(() => {
    console.log("Handling list resize!");
    if (listRef.current) {
      cache.clearCache();
      listRef.current.resetAfterIndex(0);
      lazyCacheFill();
    }
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
        cache.clearCache();
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

  /**
   * Get the size of the item.
   * @param {number} index The index of the item in the data array.
   */
  const itemSize = (index) => {
    if (!shouldItemBeMeasured(index)) {
      return { size: 100, loaded: false };
    }

    let measuredHeight;

    if (!cache.values[index]) {
      // cache.values[index] = measureIndex(index);
      return { size: 100, loaded: false };
    }
    measuredHeight = cache.values[index];

    return { size: measuredHeight, loaded: true };
  };

  const updateSizeAndOffsetCache = (
    props,
    startIndex: number,
    stopIndex: number
  ) => {
    for (var i = startIndex; i <= stopIndex; i++) {
      if (!cache.values[i]) {
        cache.values[i] = measureIndex(i);
      }
    }

    // TODO calculate fragmented offsets here.

    let measuredHeight = cache.values[startIndex];

    return { size: measuredHeight, loaded: true };
  };

  return (
    <VariableSizeList
      layout="vertical"
      ref={listRef}
      itemSize={itemSize}
      onloadedItemsRendered={updateSizeAndOffsetCache}
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
