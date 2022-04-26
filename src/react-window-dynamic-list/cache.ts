export type DynamicItemSizeMeta = {
  height: number;
};

export type ItemSizeData = {
  height: number;
  offset: number;
};

/**
 * Cache object to allow dynamic storage & calculation of offsets to avoid having to
 * recalulate all items offsets in case an item with a lower index than what has been
 * previously measured.
 */
export default class HeightCache {
  private _heightCache: Record<number, number>;
  private readonly _defaultItemHeight;

  constructor(
    initialValues: Record<number, number>,
    defaultItemHeight: number
  ) {
    this._heightCache = { ...initialValues };
    this._defaultItemHeight = defaultItemHeight;
  }

  public get DefaultItemHeight(): number {
    return this._defaultItemHeight;
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

    return this._defaultItemHeight;
  }
}
