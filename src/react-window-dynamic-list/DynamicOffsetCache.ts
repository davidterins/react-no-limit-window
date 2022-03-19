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
    const lastMeasuredOffsetEnd =
      this.m_OffsetStorage.getOffset(lastMeasuredIndex);

    const startIndex = uncachedItems[0].index;
    const stopIndex = uncachedItems[uncachedItems.length - 1].index;

    if (startIndex > lastMeasuredIndex) {
      // Get the delta from last measured Index.
      let uncachedItemCount =
        this.m_LastMeasuredIndex == -1 ? 0 : startIndex - lastMeasuredIndex;

      let unmeasuredItemsOffset = uncachedItemCount * itemDefaultHeight;

      const firstItemStartPos = lastMeasuredOffsetEnd + unmeasuredItemsOffset;

      let currentItemStartPos = firstItemStartPos;

      let newOffsets = uncachedItems.map((item) => {
        const { index, height } = item;
        let itemEnd = currentItemStartPos + height;
        currentItemStartPos = itemEnd;

        return { index: index, offsetEnd: itemEnd };
      });

      this.m_OffsetStorage.add(startIndex, stopIndex, newOffsets);

      this.m_LastMeasuredIndex = stopIndex;
    } else if (startIndex < lastMeasuredIndex) {
      console.log("Rendered items was less than last measured index");
      // Some of the items have not been measured, get the delta
    }
  }

  /**
   * Gets the items end position, i.e. its offset + height.
   */
  public getItemOffset(index: number, height: number) {
    let itemOffsetEnd = this.m_OffsetStorage.getOffset(index);
    let itemOffset = itemOffsetEnd - height;
    return itemOffset;
  }
}

type Offset = number;

interface OffsetGroup {
  startIndex: number;
  stopIndex: number;
  offsets: Offset[];
}

type IndexOffsetRange = { index: number; offsetEnd: number }[];

class OffsetStorage {
  private m_OffsetGroups: OffsetGroup[];

  constructor() {
    this.m_OffsetGroups = [];
  }

  public add(
    newRangeStartIndex: number,
    newRangeStopIndex: number,
    indexOffsetRange: IndexOffsetRange
  ) {
    console.log("Adding to offset storage", indexOffsetRange);
    const lastGroupIndex = this.m_OffsetGroups.length - 1;
    const hasGroups = this.m_OffsetGroups.length > 0;
    const lastOffsetGroupStopIndex = hasGroups
      ? this.m_OffsetGroups[lastGroupIndex].stopIndex
      : -1;

    if (newRangeStartIndex > lastOffsetGroupStopIndex) {
      const nextConnectedIndex = lastOffsetGroupStopIndex + 1;
      let rangeIsConnectedToLastGroup =
        newRangeStartIndex == nextConnectedIndex;

      if (hasGroups && rangeIsConnectedToLastGroup) {
        // Merge the values to the last measured groups
        let lastMeasuredGroup = this.m_OffsetGroups[lastGroupIndex];
        let newGroupOffsets = indexOffsetRange.map((i) => i.offsetEnd);

        // Update the last measured group.
        lastMeasuredGroup = {
          ...lastMeasuredGroup,
          stopIndex: newRangeStopIndex,
          offsets: [...lastMeasuredGroup.offsets, ...newGroupOffsets],
        };

        return;
      }

      let groupOffsets = indexOffsetRange.map((i) => i.offsetEnd);
      let newLastMeasuredGroup: OffsetGroup = {
        startIndex: newRangeStartIndex,
        stopIndex: newRangeStopIndex,
        offsets: groupOffsets,
      };

      this.m_OffsetGroups.push(newLastMeasuredGroup);

      return;
    }

    // The new offset range is less that what has been previously stored in the cache.
    // This will invalidate everything after the new range's stop index.

    // 1. If new offset range is more than any offset group, then create new disconnected group.

    // 2. Find intersecting offset groups and possibly merge if intersects...
    // 3. If new offset range is less than any offset group then invalidate/remove those groups from cache.
  }

  public getOffset(index: number) {
    if (index < 0) {
      return 0;
    }

    const lastGroupIndex = this.m_OffsetGroups.length - 1;
    const hasGroups = this.m_OffsetGroups.length > 0;

    if (!hasGroups) {
      return index * itemDefaultHeight + itemDefaultHeight;
    }

    const lastOffsetGroup = this.m_OffsetGroups[lastGroupIndex];
    const lastMeasuredOffset =
      lastOffsetGroup.offsets[lastOffsetGroup.offsets.length - 1];

    if (index > lastOffsetGroup.stopIndex) {
      let unmeasuredItemsCount = index - lastOffsetGroup.stopIndex;
      let unmeasuredOffset = unmeasuredItemsCount * itemDefaultHeight;
      let partiallyMeasuredOffset = lastMeasuredOffset + unmeasuredOffset;
      return partiallyMeasuredOffset;
    }

    const { containingGroupIndex, lastMeasuredGroupIndex } =
      this._findNearestItemBinarySearch(
        this.m_OffsetGroups.length - 1,
        0,
        index
      );

    if (containingGroupIndex != null) {
      const containingGroup = this.m_OffsetGroups[containingGroupIndex];
      const containedOffsetIndex = index - containingGroup.startIndex;
      const measuredOffset = containingGroup.offsets[containedOffsetIndex];
      return measuredOffset;
    } else {
      const previousGroup = this.m_OffsetGroups[lastMeasuredGroupIndex];
      const previousGroupsLastMeasuredOffset = previousGroup
        ? previousGroup.offsets[previousGroup.offsets.length - 1]
        : 0;

      const previousGroupStopIndex = previousGroup
        ? previousGroup.stopIndex
        : 0;
      let unmeasuredItemsCount = index - previousGroupStopIndex;
      let unmeasuredOffset = unmeasuredItemsCount * itemDefaultHeight;
      let partiallyMeasuredOffset =
        previousGroupsLastMeasuredOffset + unmeasuredOffset;

      return partiallyMeasuredOffset;
    }
  }

  private _findNearestItemBinarySearch(
    high: number,
    low: number,
    targetIndex: number
  ): { containingGroupIndex: number; lastMeasuredGroupIndex: number } {
    const containedInGroup = (itemIndex: number, group: OffsetGroup) => {
      return itemIndex >= group.startIndex && itemIndex <= group.stopIndex;
    };

    let middle: number;

    while (low <= high) {
      middle = low + Math.floor((high - low) / 2);

      const currentGroup = this.m_OffsetGroups[middle];
      const isContainedInGroup = containedInGroup(targetIndex, currentGroup);

      if (isContainedInGroup) {
        return { containingGroupIndex: middle, lastMeasuredGroupIndex: null };
      } else if (currentGroup.startIndex < targetIndex) {
        low = middle + 1;
      } else if (currentGroup.startIndex > targetIndex) {
        high = middle - 1;
      }
    }

    return { containingGroupIndex: null, lastMeasuredGroupIndex: middle - 1 };
  }
}
