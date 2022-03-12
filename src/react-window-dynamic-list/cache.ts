export type DynamicItemSizeMeta = {
  height: number;
  offset: number;
};

/** A   */
type DynamicOffsetFragment = {
  startIndex: number;
  stopIndex: number;
  offsetDeviation: number;
};

const maxNumberOfFragments = 10;
const maxNumberOfMeasuredOffsetsInAFragment = 10;

/**
 * Cache object to allow dynamic storage & calculation of offsets to avoid having to
 * recalulate all items offsets in case an item with a lower index than what has been
 * previously measured.
 */
export default class DynamicOffsetFragmentCache {
  private _fragments: Record<number, DynamicItemSizeMeta>;

  constructor(initialValues: Record<number, DynamicItemSizeMeta>) {
    this._fragments = { ...initialValues };
  }

  add(itemData: { index: number; height: number }) {
    const { index, height } = itemData;
    const previousItemData = this._get(index - 1);
    const newItemHeightOffset =
      previousItemData.offset + previousItemData.height;

    // getInter
  }

  get(itemIndex: number): DynamicItemSizeMeta {
    return this._get(itemIndex);
  }

  clearCache() {
    this._fragments = {};
  }

  private _getIntersectingFragment(low: number, high: number, offset: number) {
    while (low <= high) {
      const middle = low + Math.floor((high - low) / 2);
      const currentOffset = this._get(middle).offset;
      // const currentOffset = getItemMetadata(
      //   props,
      //   middle,
      //   instanceProps
      // ).offset;

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
  }

  _get(itemIndex: number): DynamicItemSizeMeta {
    if (itemIndex < 0) {
      return {
        offset: 0,
        height: 100,
      };
    }

    // TODO: Check if the item is contained in any of stored fragments
    //

    // containing stored offsets
    if (true) {
      // Search to see if
    }

    return this._fragments[itemIndex];
  }

  itemIndexContainedInFragment;
}
