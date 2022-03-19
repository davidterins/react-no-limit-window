import React, { forwardRef, useEffect, useLayoutEffect } from "react";
import VariableSizeList, {
  ItemMetadata,
  VariableSizeProps,
} from "../virtualized-list/VariableSizeList";
import debounce from "lodash.debounce";
import DynamicOffsetFragmentCache from "./cache";
import useShareForwardedRef from "./utils/useShareForwardRefs";
import measureElement, { destroyMeasureLayer } from "./asyncMeasurer";
import { defaultMeasurementContainer } from "./defaultMeasurementContainer";
import { DynamicOffsetCache } from "./DynamicOffsetCache";

type DynamicSizeProps<T> = VariableSizeProps & {
  cache: DynamicOffsetFragmentCache;
  lazyMeasurement: boolean;
  data: T;
  shouldItemBeMeasured: (index: number) => boolean;
  recalculateItemsOnResize: { width: boolean; height: boolean };
  debug: boolean;
};

/**
 * Create the dynamic list's cache object.
 * @param {Object} knownSizes a mapping between an items id and its size.
 */
export const createCache = (knownSizes = {}) =>
  new DynamicOffsetFragmentCache(knownSizes);

const dynamicOffsetCache = new DynamicOffsetCache();

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
    // measurementContainerElement = defaultMeasurementContainer,
    debug = false,

    ...variableSizeListProps
  }: any,
  ref: any
) => {
  const _cache = cache as DynamicOffsetFragmentCache;
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
        if (!_cache.get(i)) {
          const height = measureIndex(i);

          // Double check in case the main thread already populated this id
          if (!_cache.get(i)) {
            _cache.addHeight({ index: i, height: height });
          }
        }
      }, 0);
    }
  };

  const handleListResize = debounce(() => {
    console.log("Handling list resize!");
    if (listRef.current) {
      _cache.clearCache();
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
        _cache.clearCache();
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

    if (!_cache.get(index)) {
      // cache.values[index] = measureIndex(index);
      return { size: 100, loaded: false };
    }

    measuredHeight = _cache.get(index);

    return { size: measuredHeight, loaded: true };
  };

  const handleItemsToDisplayInListView = (
    props,
    startIndex: number,
    stopIndex: number
  ) => {
    // Here items in view has been requested to be force updated
    // since they are in now in loaded state.

    let uncachedIndices: number[] = [];

    // 1. Make sure that the indices have measure heights
    for (var index = startIndex; index <= stopIndex; index++) {
      uncachedIndices.push(index);

      if (!_cache.has(index)) {
        let measuredHeight = measureIndex(index);
        _cache.addHeight({ index, height: measuredHeight });
      }
    }

    // 2. Update the list item offsets when the rendered heights are known.
    if (uncachedIndices.length > 0) {
      // If new items have been measured, it means that the offset cache might
      // be invalidated and needs to be updated.
      let newCachedRange = uncachedIndices.map((i) => {
        return { index: i, height: _cache.get(i).height };
      });

      dynamicOffsetCache.UpdateOffsets(newCachedRange);
    }

    _cache.updateOffsets(startIndex, stopIndex);

    let cachedHeight = _cache.get(startIndex);

    return { size: cachedHeight, loaded: true };
  };

  const getItemMetaData = (index: number): ItemMetadata => {
    let itemHeight = _cache.get(index).height;
    let itemOffset = dynamicOffsetCache.getItemOffset(index, itemHeight);

    return { height: itemHeight, offset: itemOffset };
  };

  return (
    <VariableSizeList
      layout="vertical"
      ref={listRef}
      itemSize={itemSize}
      onForceUpdateLoadedItems={handleItemsToDisplayInListView}
      getItemMetaData={getItemMetaData}
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
