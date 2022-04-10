import { OffsetStorage } from "./OffsetStorage";

const itemDefaultHeight = 100;

export type MeasuredItem = { index: number; height: number };

export class DynamicOffsetCache {
  m_OffsetStorage: OffsetStorage;
  m_LastMeasuredIndex: number;
  m_lastMeasuredOffsetEnd: number;

  constructor() {
    this.m_LastMeasuredIndex = -1;
    this.m_lastMeasuredOffsetEnd = 0;
    this.m_OffsetStorage = new OffsetStorage(itemDefaultHeight);
  }

  public UpdateOffsets(measuredItems: MeasuredItem[]) {
    if (measuredItems.length == 0) return;

    const measuredRangeStartIndex = measuredItems[0].index;
    const measuredRangeStopIndex = measuredItems[measuredItems.length - 1].index;

    console.warn(
      `Last measured index: [${this.m_LastMeasuredIndex}]. Updating offsets for items`,
      measuredItems
    );

    // TODO: It might be possible to get this value earlier, e.g. when calculating stop index
    //       from start index in variable size list class.
    const previousItemIndex = measuredRangeStartIndex - 1;
    let firstItemOffsetTop = this.m_OffsetStorage.getOffsetEnd(previousItemIndex);

    let newCalculatedOffsetEnds = this._getCalculatedOffsetEnds(measuredItems, firstItemOffsetTop);

    this.m_OffsetStorage.addOffsetEnds(newCalculatedOffsetEnds);

    console.error(
      `Updating last measured index from ${this.m_LastMeasuredIndex} -> ${measuredRangeStopIndex}`
    );

    this.m_lastMeasuredOffsetEnd =
      newCalculatedOffsetEnds[newCalculatedOffsetEnds.length - 1].offsetEnd;
    this.m_LastMeasuredIndex = measuredRangeStopIndex;
  }

  /**
   * Gets the items offset top position.
   */
  public getItemOffset(index: number, height: number) {
    let itemOffsetEnd = this.m_OffsetStorage.getOffsetEnd(index);
    let itemOffset = itemOffsetEnd - height;
    return itemOffset;
  }

  private _getCalculatedOffsetEnds(measuredItems: MeasuredItem[], previousItemOffsetEnd: number) {
    let currentItemStartPos = previousItemOffsetEnd;

    let newOffsets = measuredItems.map((item) => {
      const { index, height } = item;
      let itemOffsetEnd = currentItemStartPos + height;
      currentItemStartPos = itemOffsetEnd;

      return { index: index, offsetEnd: itemOffsetEnd, height: height };
    });

    return newOffsets;
  }
}
