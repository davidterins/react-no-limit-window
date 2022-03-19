const itemDefaultHeight = 100;

export class DynamicOffsetCache {
  m_OffsetStorage: OffsetStorage;
  m_LastMeasuredIndex: number;
  constructor() {
    this.m_LastMeasuredIndex = -1;
    this.m_OffsetStorage = new OffsetStorage();
  }

  public UpdateOffsets(uncachedItems: { index: number; height: number }[]) {
    if (uncachedItems.length == 0) return;

    const lastMeasuredIndex = this.m_LastMeasuredIndex;
    const lastMeasuredOffsetEnd = this.m_OffsetStorage.get(lastMeasuredIndex);

    const startIndex = uncachedItems[0].index;
    const stopIndex = uncachedItems[uncachedItems.length - 1].index;

    if (startIndex > lastMeasuredIndex) {
      // Get the delta from last measured Index.
      let uncachedItemCount =
        this.m_LastMeasuredIndex == -1 ? 0 : startIndex - lastMeasuredIndex;

      let unmeasuredItemsOffset = uncachedItemCount * itemDefaultHeight;

      const firstItemStartPos = lastMeasuredOffsetEnd + unmeasuredItemsOffset;

      let currentItemStartPos = firstItemStartPos;

      let newOffsetEnds = uncachedItems.map((item) => {
        const { index, height } = item;
        let itemEnd = currentItemStartPos + height;

        // this.m_OffsetStorage.add(index, itemEnd);

        currentItemStartPos = itemEnd;

        return { index: index, offsetEnd: itemEnd };
      });

      this.m_OffsetStorage.add(newOffsetEnds);

      //   uncachedItems.forEach((item) => {
      //     const { index, height } = item;
      //     let itemEnd = currentItemStartPos + height;

      //     this.m_OffsetStorage.add(index, itemEnd);

      //     currentItemStartPos = itemEnd;
      //   });

      this.m_LastMeasuredIndex = stopIndex;
    } else if (startIndex < lastMeasuredIndex) {
      // Some of the items have not been measured, get the delta
    }
  }

  /**
   * Gets the items end position, i.e. its offset + height.
   */
  public getItemEndPosition(index: number) {
    //   if(index > )
    return 0;
  }
}

type Offset = number;

interface MeasuredOffsetGroup {
  startIndex: number;
  stopIndex: number;
  offsets: Offset[];
}

interface UnMeasuredOffsetGroup {
  startIndex: number;
  stopIndex: number;
}

type OffsetGroup = MeasuredOffsetGroup | UnMeasuredOffsetGroup;

class OffsetStorage {
  private m_Offsets: Record<number, number>;

  private m_OffsetGroups: OffsetGroup[] = [];

  constructor() {
    this.m_Offsets = {};
  }

  public add(offsets: { index: number; offsetEnd: number }[]) {
    // 1. Find intersecting offset groups and possibly merge if intersects...
    // 2. If new offset range is less than any offset group then invalidate/remove those groups from cache.
    // 3. If new offset range is more than any offset group, then create a new disconnected group.
  }

  public get(index: number) {
    if (index < 0) {
      return 0;
    }
  }
}
