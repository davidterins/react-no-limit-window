import createListComponent, { IScrollable } from "./createListComponent";
import { Props, ScrollToAlign } from "./listComponent.types";
const DEFAULT_ESTIMATED_ITEM_SIZE = 100;
type VariableSizeProps = Props<any> & {
  estimatedItemSize: number;
};
type ItemSizeGetter = (index: number) => { size: number; loaded: boolean };
type ItemMetadata = {
  offset: number;
  size: number;
  loadedDuringMeasure: boolean;
};
type InstanceProps = {
  itemMetadataMap: Record<number, ItemMetadata>;
  estimatedItemSize: number;
  lastMeasuredIndex: number;
};

const getItemMetadata = (
  props: Props<any>,
  itemIndex: number,
  instanceProps: InstanceProps
): ItemMetadata => {
  const { itemSize, estimatedItemSize } = props as VariableSizeProps;
  const { itemMetadataMap, lastMeasuredIndex } = instanceProps;

  if (itemIndex > lastMeasuredIndex) {
    let offset = 0;

    if (lastMeasuredIndex >= 0) {
      const lastMeasuredItemMetadata = itemMetadataMap[lastMeasuredIndex];
      offset = lastMeasuredItemMetadata.offset + lastMeasuredItemMetadata.size;
    }

    for (let i = lastMeasuredIndex + 1; i <= itemIndex; i++) {
      let itemSizeGetter = itemSize as ItemSizeGetter;
      let { size, loaded } = itemSizeGetter(i);

      // if (!loaded) {
      //   console.log(`Index ${itemIndex} - height ${size} NOT loaded`);
      // } else {
      //   console.log(`Index ${itemIndex} - height ${size} LOADED`);
      // }

      itemMetadataMap[i] = {
        offset,
        size,
        loadedDuringMeasure: loaded,
      };
      offset += size;

      if (loaded) {
        instanceProps.lastMeasuredIndex = itemIndex;
      }
    }
  }

  return itemMetadataMap[itemIndex];
};

const findNearestItemIndexForOffset = (
  props: Props<any>,
  instanceProps: InstanceProps,
  offset: number
): number => {
  const { itemMetadataMap, lastMeasuredIndex } = instanceProps;
  console.log("Find Start index lastMesauredIndex", lastMeasuredIndex);
  const lastMeasuredItemOffset =
    lastMeasuredIndex > 0 ? itemMetadataMap[lastMeasuredIndex].offset : 0;

  if (offset > lastMeasuredItemOffset) {
    console.log(`Find Start index for offset: ${offset} EXP SEARCH!!`);
    // If we haven't yet measured this high, fallback to an exponential search with an inner binary search.
    // The exponential search avoids pre-computing sizes for the full set of items as a binary search would.
    // The overall complexity for this approach is O(log n).
    return findNearestItemExponentialSearch(
      props,
      instanceProps,
      Math.max(0, lastMeasuredIndex),
      offset
    );
  } else {
    console.log(`Find Start index for offset: ${offset} BIN SEARCH!!`);
    // If we've already measured items within this range just use a binary search as it's faster.
    return findNearestItemBinarySearch(
      props,
      instanceProps,
      lastMeasuredIndex,
      0,
      offset
    );
  }
};

const findNearestItemBinarySearch = (
  props: Props<any>,
  instanceProps: InstanceProps,
  high: number,
  low: number,
  offset: number
): number => {
  while (low <= high) {
    const middle = low + Math.floor((high - low) / 2);
    const currentOffset = getItemMetadata(props, middle, instanceProps).offset;

    if (currentOffset === offset) {
      return middle;
    } else if (currentOffset < offset) {
      low = middle + 1;
    } else if (currentOffset > offset) {
      high = middle - 1;
    }
  }

  if (low > 0) {
    return low - 1;
  } else {
    return 0;
  }
};

const findNearestItemExponentialSearch = (
  listProps: Props<any>,
  instanceProps: InstanceProps,
  index: number,
  offset: number
): number => {
  const { itemCount } = listProps;
  let interval = 1;

  while (
    index < itemCount &&
    getItemMetadata(listProps, index, instanceProps).offset < offset
  ) {
    index += interval;
    interval *= 2;
  }

  const high = Math.min(index, itemCount - 1);
  const low = Math.floor(index / 2);

  console.log("Bin search item range", low, high);
  console.log("Props", listProps);
  console.log("InstanceProps", instanceProps);
  return findNearestItemBinarySearch(
    listProps,
    instanceProps,
    high,
    low,
    offset
  );
};

const getEstimatedTotalSize = (
  { itemCount }: Props<any>,
  { itemMetadataMap, estimatedItemSize, lastMeasuredIndex }: InstanceProps
) => {
  let totalSizeOfMeasuredItems = 0;

  // Edge case check for when the number of items decreases while a scroll is in progress.
  // https://github.com/bvaughn/react-window/pull/138
  if (lastMeasuredIndex >= itemCount) {
    lastMeasuredIndex = itemCount - 1;
  }

  if (lastMeasuredIndex >= 0) {
    const itemMetadata = itemMetadataMap[lastMeasuredIndex];
    totalSizeOfMeasuredItems = itemMetadata.offset + itemMetadata.size;
  }

  const numUnmeasuredItems = itemCount - lastMeasuredIndex - 1;
  const totalSizeOfUnmeasuredItems = numUnmeasuredItems * estimatedItemSize;

  return totalSizeOfMeasuredItems + totalSizeOfUnmeasuredItems;
};

const VariableSizeList = createListComponent({
  getItemOffset: (
    props: Props<any>,
    index: number,
    instanceProps: InstanceProps
  ): number => getItemMetadata(props, index, instanceProps).offset,
  getItemSize: (
    props: Props<any>,
    index: number,
    instanceProps: InstanceProps
  ): number => instanceProps.itemMetadataMap[index].size,
  getEstimatedTotalSize,
  getOffsetForIndexAndAlignment: (
    props: Props<any>,
    index: number,
    align: ScrollToAlign,
    scrollOffset: number,
    instanceProps: InstanceProps
  ): number => {
    const { direction, height, layout, width } = props;
    // TODO Deprecate direction "horizontal"
    const isHorizontal = direction === "horizontal" || layout === "horizontal";
    const size = (isHorizontal ? width : height) as any as number;
    const itemMetadata = getItemMetadata(props, index, instanceProps);

    // Get estimated total size after ItemMetadata is computed,
    // To ensure it reflects actual measurements instead of just estimates.
    const estimatedTotalSize = getEstimatedTotalSize(props, instanceProps);
    const maxOffset = Math.max(
      0,
      Math.min(estimatedTotalSize - size, itemMetadata.offset)
    );
    const minOffset = Math.max(
      0,
      itemMetadata.offset - size + itemMetadata.size
    );

    if (align === "smart") {
      if (
        scrollOffset >= minOffset - size &&
        scrollOffset <= maxOffset + size
      ) {
        align = "auto";
      } else {
        align = "center";
      }
    }

    switch (align) {
      case "start":
        return maxOffset;

      case "end":
        return minOffset;

      case "center":
        return Math.round(minOffset + (maxOffset - minOffset) / 2);

      case "auto":
      default:
        if (scrollOffset >= minOffset && scrollOffset <= maxOffset) {
          return scrollOffset;
        } else if (scrollOffset < minOffset) {
          return minOffset;
        } else {
          return maxOffset;
        }
    }
  },
  getStartIndexForOffset: (
    props: Props<any>,
    offset: number,
    instanceProps: InstanceProps
  ): number => findNearestItemIndexForOffset(props, instanceProps, offset),
  getStopIndexForStartIndex: (
    props: Props<any>,
    startIndex: number,
    scrollOffset: number,
    instanceProps: InstanceProps
  ): number => {
    const { direction, height, itemCount, layout, width } = props;
    // TODO Deprecate direction "horizontal"
    const isHorizontal = direction === "horizontal" || layout === "horizontal";
    const size = (isHorizontal ? width : height) as any as number;
    const itemMetadata = getItemMetadata(props, startIndex, instanceProps);
    const maxOffset = scrollOffset + size;

    let offset = itemMetadata.offset + itemMetadata.size;
    let stopIndex = startIndex;

    while (stopIndex < itemCount - 1 && offset < maxOffset) {
      stopIndex++;
      offset += getItemMetadata(props, stopIndex, instanceProps).size;
    }

    return stopIndex;
  },

  initInstanceProps(props: Props<any>, instance: any): InstanceProps {
    const { estimatedItemSize } = props as any as VariableSizeProps;
    const instanceProps = {
      itemMetadataMap: {},
      estimatedItemSize: estimatedItemSize || DEFAULT_ESTIMATED_ITEM_SIZE,
      lastMeasuredIndex: -1,
    };

    instance.resetAfterIndex = (
      index: number,
      shouldForceUpdate: boolean = true
    ) => {
      console.log("RESET AFTER INDEX");
      instanceProps.lastMeasuredIndex = Math.min(
        instanceProps.lastMeasuredIndex,
        index - 1
      );

      // We could potentially optimize further by only evicting styles after this index,
      // But since styles are only cached while scrolling is in progress-
      // It seems an unnecessary optimization.
      // It's unlikely that resetAfterIndex() will be called while a user is scrolling.
      instance._getItemStyleCache(-1);

      if (shouldForceUpdate) {
        instance.forceUpdate();
      }
    };

    return instanceProps;
  },

  shouldResetStyleCacheOnItemSizeChange: false,
  validateProps: ({ itemSize }: Props<any>): void => {
    if (process.env.NODE_ENV !== "production") {
      if (typeof itemSize !== "function") {
        throw Error(
          'An invalid "itemSize" prop has been specified. ' +
            "Value should be a function. " +
            `"${itemSize === null ? "null" : typeof itemSize}" was specified.`
        );
      }
    }
  },
});

export default VariableSizeList;
