import createListComponent, { IScrollable } from "./createListComponent";
import {
  Props,
  ScrollToAlign,
  ItemInfoForOffset,
  StopItemInfoForOffset,
} from "./listComponent.types";
const DEFAULT_ESTIMATED_ITEM_SIZE = 100;
export type VariableSizeProps = Props<any> & {
  estimatedItemSize: number;
  getItemHeight: (index: number) => number;
  getItemOffset: (index: number) => number;
};

export type ItemMetadata = {
  offset: number;
  height: number;
  // loadedDuringMeasure: boolean;
};

type InstanceProps = {
  itemMetadataMap: Record<number, ItemMetadata>;
  estimatedItemSize: number;
  lastMeasuredIndex: number;
};

const _getStartIndexForOffset = (
  props: Props<any>,
  instanceProps: InstanceProps,
  offset: number
): ItemInfoForOffset => {
  let high = props.itemCount - 1;
  let low = 0;

  const nearestItemIndex = _findNearestItemBinarySearch(
    props as VariableSizeProps,
    instanceProps,
    high,
    low,
    offset
  );

  // console.log("Start Renderable Index: ", nearestItemIndex);

  return nearestItemIndex;
};

const _findNearestItemBinarySearch = (
  props: VariableSizeProps,
  instanceProps: InstanceProps,
  high: number,
  low: number,
  offset: number
): ItemInfoForOffset => {
  while (low <= high) {
    const middle = low + Math.floor((high - low) / 2);
    const currentOffset = props.getItemOffset(middle);
    // const currentOffset = getItemMetadata(props, middle, instanceProps).offset;

    if (currentOffset === offset) {
      // This will be the first start/first item in the rendered view.
      // Make sure that it is properly measured and cache is updated accordingly.
      props.onJITMeasurement(props, middle, middle);
      const measuredHeight = props.getItemHeight(middle);
      return {
        index: middle,
        offsetTop: currentOffset,
        height: measuredHeight,
      };
      // return middle;
    } else if (currentOffset < offset) {
      low = middle + 1;
    } else if (currentOffset > offset) {
      high = middle - 1;
    }
  }

  if (low > 0) {
    // return low - 1;
    let ind = low - 1;
    const off = props.getItemOffset(ind);
    const hei = props.getItemHeight(ind);
    return { index: ind, offsetTop: off, height: hei };
  } else {
    return { index: 0, offsetTop: 0, height: props.getItemHeight(0) };
  }
};

const _getStopIndexForStartIndex = (
  props: Props<any>,
  startItemInfo: ItemInfoForOffset,
  scrollOffset: number,
  instanceProps: InstanceProps
): StopItemInfoForOffset => {
  const { direction, height, itemCount, layout, width, getItemHeight } =
    props as VariableSizeProps;
  // TODO Deprecate direction "horizontal"
  const isHorizontal = direction === "horizontal" || layout === "horizontal";
  const size = (isHorizontal ? width : height) as any as number;
  // const itemMetadata = getItemMetadata(props, startIndex, instanceProps);

  const {
    index: startItemIndex,
    offsetTop: startItemOffset,
    height: startItemHeight,
  } = startItemInfo;

  const maxOffset = scrollOffset + size;

  let currentItemOffset = startItemOffset + startItemHeight;
  let stopIndex = startItemIndex;
  let itemMeasurementInfos: ItemInfoForOffset[] = [startItemInfo];

  while (stopIndex < itemCount - 1 && currentItemOffset < maxOffset) {
    // measure if needed
    stopIndex++;
    props.onJITMeasurement(props, stopIndex, stopIndex);
    const nextItemHeight = getItemHeight(stopIndex);
    itemMeasurementInfos.push({
      index: stopIndex,
      offsetTop: currentItemOffset,
      height: nextItemHeight,
    });
    currentItemOffset += nextItemHeight;
  }

  return { stopIndex: stopIndex, itemMeasurementInfos: itemMeasurementInfos };
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
    totalSizeOfMeasuredItems = itemMetadata.offset + itemMetadata.height;
  }

  const numUnmeasuredItems = itemCount - lastMeasuredIndex - 1;
  const totalSizeOfUnmeasuredItems = numUnmeasuredItems * estimatedItemSize;

  return totalSizeOfMeasuredItems + totalSizeOfUnmeasuredItems;
};

const VariableSizeList = createListComponent({
  onloadedItemsRendered: (props, startIndex, stopIndex) => {
    props.onForceUpdateLoadedItems(props, startIndex, stopIndex);
  },
  getItemOffset: (
    props: Props<any>,
    index: number,
    instanceProps: InstanceProps
  ): number => {
    const { getItemOffset } = props as VariableSizeProps;
    return getItemOffset(index);
  },
  // getItemSize: (
  //   props: Props<any>,
  //   index: number,
  //   instanceProps: InstanceProps
  // ): number => {
  //   const { getItemHeight } = props as VariableSizeProps;
  //   return getItemHeight(index);
  // },
  getEstimatedTotalSize,
  getOffsetForIndexAndAlignment: (
    props: Props<any>,
    index: number,
    align: ScrollToAlign,
    scrollOffset: number,
    instanceProps: InstanceProps
  ): number => {
    const { direction, height, layout, width, getItemOffset, getItemHeight } =
      props as VariableSizeProps;
    // TODO Deprecate direction "horizontal"
    const isHorizontal = direction === "horizontal" || layout === "horizontal";
    const size = (isHorizontal ? width : height) as any as number;
    // const itemMetadata = getItemMetadata(props, index, instanceProps);
    const targetItemHeight = getItemHeight(index);
    const targetItemOffset = getItemOffset(index);

    // Get estimated total size after ItemMetadata is computed,
    // To ensure it reflects actual measurements instead of just estimates.
    const estimatedTotalSize = getEstimatedTotalSize(props, instanceProps);
    const maxOffset = Math.max(
      0,
      Math.min(estimatedTotalSize - size, targetItemOffset)
    );
    const minOffset = Math.max(0, targetItemOffset - size + targetItemHeight);

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
  ): ItemInfoForOffset => _getStartIndexForOffset(props, instanceProps, offset),
  getStopIndexForStartIndex: (
    props: Props<any>,
    startItemInfo: ItemInfoForOffset,
    scrollOffset: number,
    instanceProps: InstanceProps
  ): StopItemInfoForOffset =>
    _getStopIndexForStartIndex(
      props,
      startItemInfo,
      scrollOffset,
      instanceProps
    ),
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
  validateProps: (/*{ itemSize }: Props<any>*/): void => {
    // if (process.env.NODE_ENV !== "production") {
    //   if (typeof itemSize !== "function") {
    //     throw Error(
    //       'An invalid "itemSize" prop has been specified. ' +
    //         "Value should be a function. " +
    //         `"${itemSize === null ? "null" : typeof itemSize}" was specified.`
    //     );
    //   }
    // }
  },
});

export default VariableSizeList;
