export type DynamicItemSizeMeta = {
  height: number;
};

export type ItemSizeData = {
  height: number;
  offset: number;
};

/** Contains a consecutive sequence of measured offsets*/
type OffsetCluster = {
  startIndex: number;
  stopIndex: number;
  offsets: number[];
  offsetDeviation: number;
};

const defaultItemHeight = 100;

/**
 * Cache object to allow dynamic storage & calculation of offsets to avoid having to
 * recalulate all items offsets in case an item with a lower index than what has been
 * previously measured.
 */
export default class DynamicOffsetFragmentCache {
  private _fragmentedOffsets: Record<number, number>;
  private _heightCache: Record<number, number>;
  private highestRequestedIndex: number;

  private _offsetCheckPoints: OffsetCluster[];

  constructor(initialValues: Record<number, number>) {
    this._fragmentedOffsets = { ...initialValues };
    this._heightCache = {};
    this._offsetCheckPoints = [];
    this.highestRequestedIndex = -1;
  }

  public addHeight(itemData: { index: number; height: number }) {
    const { index, height } = itemData;
    this._heightCache[index] = height;
  }

  public updateOffsets(startIndex: number, stopIndex: number) {
    if (!this.has(stopIndex)) {
      this.highestRequestedIndex = stopIndex;
    }

    const checkPointCount = this._offsetCheckPoints.length;

    const prevItemIndex = startIndex - 1;
    const prevItemOffset = this._getOffsetForIndex(prevItemIndex);
    const prevItemHeight = this._getHeightForIndex(prevItemIndex);

    let currentOffset = prevItemOffset + prevItemHeight;

    for (var i = startIndex; i <= stopIndex; i++) {
      this._fragmentedOffsets[i] = currentOffset;
      currentOffset += this._getHeightForIndex(i);
    }

    if (checkPointCount == 0) {
      // let checkPoint: OffsetCluster = {
      //   startIndex: startIndex,
      //   stopIndex: stopIndex,
      // };
      // const prevItemIndex = startIndex - 1;
      // const prevItemOffset = this._getOffsetForIndex(prevItemIndex);
      // const prevItemHeight = this._heightCache[prevItemIndex];
      // this._offsetCheckPoints.push();
    }

    // if()

    // this._offsetCheckPoints.forEach((checkpoint) => {
    //   if(startIndex >= checkpoint.startIndex)
    // });

    // const { index, height } = itemData;
    // const prevItemIndex = index - 1;

    // const prevItemOffset = this._getOffsetForIndex(prevItemIndex);
    // const prevItemHeight = this._heightCache[prevItemIndex];
    // const newItemOffset = prevItemOffset + prevItemHeight;

    // console.log("highest cached item", this.highestRequestedIndex);

    // this._heightCache[index] = height;
    // this._fragmentedOffsets[index] = newItemOffset;
  }

  public has(itemIndex: number): boolean {
    let hasOffset = this._fragmentedOffsets[itemIndex] != undefined;
    let hasHeight = this._heightCache[itemIndex] != undefined;

    return hasOffset && hasHeight;
  }

  public get(itemIndex: number): ItemSizeData {
    let height = this._getHeightForIndex(itemIndex);
    let offset = this._getOffsetForIndex(itemIndex);
    return { height, offset };
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
    this._fragmentedOffsets = {};
    this._heightCache = {};
  }

  private _getOffsetForIndex(itemIndex: number): number {
    if (itemIndex < 0) {
      return 0;
    }

    const cachedValue = this._fragmentedOffsets[itemIndex];

    if (cachedValue) {
      return cachedValue;
    }

    if (itemIndex > this.highestRequestedIndex) {
      let indexDelta = itemIndex - this.highestRequestedIndex;
      let offsetFromLastMeasured = indexDelta * defaultItemHeight;

      const offset = offsetFromLastMeasured + defaultItemHeight;

      return offset;
    } else if (itemIndex <= this.highestRequestedIndex) {
      // Lower item was not in cache/measured...
      // Invalidate offsets of all higher indices since they will need
      // to be re-measured.
    }

    return 0;
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

  private binaryOffsetSearchForIndex(
    low: number,
    high: number,
    offset: number
  ) {
    while (low <= high) {
      const middle = low + Math.floor((high - low) / 2);
      const currentOffset = this._getOffsetForIndex(middle);
      // this._getHeightForIndex(middle).offset;
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
}
