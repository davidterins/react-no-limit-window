export type DynamicItemSizeMeta = {
  height: number;
};

export type ItemSizeData = {
  height: number;
  offset: number;
};

const defaultItemHeight = 100;

/**
 * Cache object to allow dynamic storage & calculation of offsets to avoid having to
 * recalulate all items offsets in case an item with a lower index than what has been
 * previously measured.
 */
export default class HeightCache {
  private _heightCache: Record<number, number>;

  constructor(initialValues: Record<number, number>) {
    this._heightCache = { ...initialValues };
  }

  public addHeight(itemData: { index: number; height: number }) {
    const { index, height } = itemData;
    this._heightCache[index] = height;
  }

  public has(itemIndex: number): boolean {
    let hasHeight = this._heightCache[itemIndex] != undefined;

    return hasHeight;
  }

  public get(itemIndex: number): number {
    let height = this._getHeightForIndex(itemIndex);
    return height;
  }

  // public getNumberOfCachedItems() {
  //   let lastMeasuredIndex = this.highestRequestedIndex;
  //   return lastMeasuredIndex + 1;
  // }

  // public getTotalCachedItemHeight() {
  //   let lastMeasuredIndex = this.highestRequestedIndex;
  //   let lastCachedOffset = this._getOffsetForIndex(lastMeasuredIndex);
  //   return lastCachedOffset;
  // }

  clearCache() {
    this._heightCache = {};
  }

  private _getHeightForIndex(itemIndex: number) {
    if (itemIndex < 0) {
      return 0;
    }

    const cachedHeight = this._heightCache[itemIndex];

    if (cachedHeight) {
      return cachedHeight;
    }

    return defaultItemHeight;
  }
}
