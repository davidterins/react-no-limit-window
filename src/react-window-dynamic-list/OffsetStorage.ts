import { thumbVerticalStyleDefault } from "../scrollbar/Scrollbars/styles";

type Offset = number;

interface OffsetGroup {
  startIndex: number;
  stopIndex: number;
  offsets: Offset[];
}

type GroupActionType =
  | "NewDisconnectedGroup"
  | "AppendToExistingGroup"
  | "PrependToExistingGroup"
  | "MergeTwoExistingGroups";

interface GroupActionBase {
  actionType: GroupActionType;
}

interface NewDisconnectedGroupAction extends GroupActionBase {
  actionType: "NewDisconnectedGroup";
  afterGroupIndex: number;
}
interface AppendToExistingGroupAction extends GroupActionBase {
  actionType: "AppendToExistingGroup";
  appendedGroupIndex: number;
}
interface PrependToExistingGroupAction extends GroupActionBase {
  actionType: "PrependToExistingGroup";
  prependedGroupIndex: number;
}
interface MergeTwoExistingGroupsAction extends GroupActionBase {
  actionType: "MergeTwoExistingGroups";
  mergingGroupIndices: { first: number; second: number };
}

export type IndexOffset = { index: number; offsetEnd: number; height: number };

export class OffsetStorage {
  private m_OffsetGroups: OffsetGroup[];
  private m_itemDefaultHeight: number;

  constructor(defaultItemHeight: number) {
    this.m_itemDefaultHeight = defaultItemHeight;
    this.m_OffsetGroups = [];
  }

  public GetLastOffsetGroupStopIndex() {
    if (this.m_OffsetGroups.length > 0) {
      const lastGroupIndex = this.m_OffsetGroups.length - 1;
      return this.m_OffsetGroups[lastGroupIndex].stopIndex;
    }

    return 0;
  }

  public addOffsetEnds(indexOffsetRange: IndexOffset[]) {
    const groupAction = this._detmermineGroupAction(indexOffsetRange);
    const offsets = indexOffsetRange.map((i) => i.offsetEnd);
    const heights = indexOffsetRange.map((i) => i.height);

    switch (groupAction.actionType) {
      case "AppendToExistingGroup": {
        this._handleAppendToExistingGroup(groupAction as AppendToExistingGroupAction, offsets);
        break;
      }
      case "PrependToExistingGroup": {
        this._handlePrependToExistingGroup(
          groupAction as PrependToExistingGroupAction,
          offsets,
          heights
        );
        break;
      }
      case "MergeTwoExistingGroups": {
        this._handleMergeTwoExistingGroups(groupAction as MergeTwoExistingGroupsAction, offsets);
        break;
      }
      case "NewDisconnectedGroup": {
        this._handleNewDisconnectedGroup(
          groupAction as NewDisconnectedGroupAction,
          indexOffsetRange
        );
        break;
      }
      default:
        throw "Unknown group action!";
    }
  }

  private _handleAppendToExistingGroup(action: AppendToExistingGroupAction, offsets: number[]) {
    const { appendedGroupIndex } = action;
    const appendingGroup = this.m_OffsetGroups[appendedGroupIndex];
    const isLastGroup = appendedGroupIndex == this.m_OffsetGroups.length - 1;

    appendingGroup.offsets.push(...offsets);
    appendingGroup.stopIndex = appendingGroup.stopIndex + offsets.length;

    if (!isLastGroup) {
      // Delete rest of the groups as their offset are invalidated.
      this.m_OffsetGroups.length = appendedGroupIndex + 1;
    }
  }

  private _handlePrependToExistingGroup(
    action: PrependToExistingGroupAction,
    offsets: number[],
    heights: number[]
  ) {
    const { prependedGroupIndex } = action;
    const prependingGroup = this.m_OffsetGroups[prependedGroupIndex];
    const isLastGroup = prependedGroupIndex == this.m_OffsetGroups.length - 1;

    // TODO - Done: This will invalidate all offsets after the new ones,
    //       so update offsets of some maybe 50 of the following items and cut the group?
    let newItemsDefaultHeightSum = offsets.length * this.m_itemDefaultHeight;
    let newItemsMeasuredHeightSum = heights.reduce((partialSum, a) => partialSum + a, 0);
    let deltaHeightChange = newItemsMeasuredHeightSum - newItemsDefaultHeightSum;

    if (prependingGroup.offsets.length > 50) {
      prependingGroup.offsets.length = 50;
    }

    for (let i = 0; i < prependingGroup.offsets.length; i++) {
      prependingGroup.offsets[i] += deltaHeightChange;
    }

    prependingGroup.offsets.unshift(...offsets);
    prependingGroup.startIndex = prependingGroup.startIndex - offsets.length;

    if (!isLastGroup) {
      // Delete rest of the groups as their offset are invalidated.
      this.m_OffsetGroups.length = prependedGroupIndex + 1;
    }
  }

  private _handleNewDisconnectedGroup(action: NewDisconnectedGroupAction, offsets: IndexOffset[]) {
    const { afterGroupIndex } = action;
    const willBeLastGroup = afterGroupIndex == this.m_OffsetGroups.length - 1;
    let newDisconnectedGroup: OffsetGroup = {
      startIndex: offsets[0].index,
      stopIndex: offsets[offsets.length - 1].index,
      offsets: offsets.map((i) => i.offsetEnd),
    };

    if (willBeLastGroup) {
      this.m_OffsetGroups.push(newDisconnectedGroup);
    } else {
      // 1. Insert after previous group index.
      this.m_OffsetGroups.length == afterGroupIndex + 1; // TODO: now this deletes all groups post to it.
      this.m_OffsetGroups.push(newDisconnectedGroup);
      // 2. Delete/update groups after the new group.
      // TODO: This will invalidate all offsets after the new ones,
      //       so update offsets of some maybe 50 of the following items and cut the group?
    }
  }

  private _handleMergeTwoExistingGroups(action: MergeTwoExistingGroupsAction, offsets: number[]) {
    const { first, second } = action.mergingGroupIndices;
    const firstGroup = this.m_OffsetGroups[first];
    const secondGroup = this.m_OffsetGroups[second];

    firstGroup.offsets.push(...offsets);
    firstGroup.stopIndex += offsets.length;

    const additionalOffset = offsets.reduce((partialSum, a) => partialSum + a, 0);

    // TODO: maybe cut the second group if it is too long for performance reasons.
    secondGroup.offsets.forEach((offset) => {
      offset += additionalOffset;
    });

    firstGroup.offsets.push(...secondGroup.offsets);
    firstGroup.stopIndex += secondGroup.offsets.length;

    this.m_OffsetGroups.length = first + 1;
  }

  private _detmermineGroupAction(newIndexOffsetRange: IndexOffset[]): GroupActionBase {
    const lastOffsetIndex = newIndexOffsetRange.length - 1;
    const firstItem = newIndexOffsetRange[0];
    const lastItem = newIndexOffsetRange[lastOffsetIndex];

    const lastOffsetGroupIndex =
      this.m_OffsetGroups.length > 0 ? this.m_OffsetGroups.length - 1 : 0;

    if (this.m_OffsetGroups.length == 0) {
      let newDisconnectedGroupAction: NewDisconnectedGroupAction = {
        actionType: "NewDisconnectedGroup",
        afterGroupIndex: -1,
      };

      return newDisconnectedGroupAction;
    }

    const containingOrPreviousGroupToStartIndex = this._findContainingOrPreviousGroupToItemIndex1(
      lastOffsetGroupIndex,
      0,
      firstItem.index
    );

    const { groupIndex: prevGroupIndex, contained } = containingOrPreviousGroupToStartIndex;

    if (contained) {
      throw `A Group should not be be able to be contained,
       since a group should consist of a sequence of elements without empty fragments in between them.`;
    }

    const previousGroup = this.m_OffsetGroups[prevGroupIndex];
    const previousGroupIsLast = prevGroupIndex == this.m_OffsetGroups.length - 1;
    const nextGroup = previousGroupIsLast ? null : this.m_OffsetGroups[prevGroupIndex + 1];

    if (
      firstItem.index == previousGroup?.stopIndex + 1 &&
      lastItem.index == nextGroup?.startIndex - 1
    ) {
      let mergeGroupsAction: MergeTwoExistingGroupsAction = {
        actionType: "MergeTwoExistingGroups",
        mergingGroupIndices: {
          first: prevGroupIndex,
          second: prevGroupIndex + 1,
        },
      };

      return mergeGroupsAction;
    } else if (
      firstItem.index == previousGroup?.stopIndex + 1 &&
      lastItem.index != nextGroup?.startIndex - 1
    ) {
      let appendToGroupAction: AppendToExistingGroupAction = {
        actionType: "AppendToExistingGroup",
        appendedGroupIndex: prevGroupIndex,
      };

      return appendToGroupAction;
    } else if (
      firstItem.index != previousGroup?.stopIndex + 1 &&
      lastItem.index == nextGroup?.startIndex - 1
    ) {
      let prependToGroupAction: PrependToExistingGroupAction = {
        actionType: "PrependToExistingGroup",
        prependedGroupIndex: prevGroupIndex + 1,
      };

      return prependToGroupAction;
    }

    let newDisconnectedGroupAction: NewDisconnectedGroupAction = {
      actionType: "NewDisconnectedGroup",
      afterGroupIndex: prevGroupIndex,
    };

    return newDisconnectedGroupAction;
  }

  public getOffsetEnd(index: number) {
    if (index < 0) {
      return 0;
    }

    const lastGroupIndex = this.m_OffsetGroups.length - 1;
    const hasGroups = this.m_OffsetGroups.length > 0;

    if (!hasGroups) {
      return index * this.m_itemDefaultHeight + this.m_itemDefaultHeight;
    }

    const lastOffsetGroup = this.m_OffsetGroups[lastGroupIndex];
    const lastMeasuredOffset = lastOffsetGroup.offsets[lastOffsetGroup.offsets.length - 1];

    if (index > lastOffsetGroup.stopIndex) {
      let unmeasuredItemsCount = index - lastOffsetGroup.stopIndex;
      let unmeasuredOffset = unmeasuredItemsCount * this.m_itemDefaultHeight;
      let partiallyMeasuredOffset = lastMeasuredOffset + unmeasuredOffset;
      return partiallyMeasuredOffset;
    }

    const { groupIndex, contained } = this._findContainingOrPreviousGroupToItemIndex2(
      this.m_OffsetGroups.length - 1,
      0,
      index
    );

    if (contained) {
      const containingGroup = this.m_OffsetGroups[groupIndex];
      const containedOffsetIndex = index - containingGroup.startIndex;
      const measuredOffset = containingGroup.offsets[containedOffsetIndex];
      return measuredOffset;
    } else {
      const previousGroup = this.m_OffsetGroups[groupIndex];
      const previousGroupsLastMeasuredOffset = previousGroup
        ? previousGroup.offsets[previousGroup.offsets.length - 1]
        : 0;

      const previousGroupStopIndex = previousGroup ? previousGroup.stopIndex : 0;
      let unmeasuredItemsCount = index - previousGroupStopIndex;
      let unmeasuredOffset = unmeasuredItemsCount * this.m_itemDefaultHeight;
      let partiallyMeasuredOffset = previousGroupsLastMeasuredOffset + unmeasuredOffset;

      return partiallyMeasuredOffset;
    }
  }

  /** Method "1" and "2" should be the same method, but is split out to be easier to debug,
   * since "2" is called a massive amount of times and will interfere when trying to
   * debug. TODO: MERGE these functions back to one when no more need to debug a lot.
   */
  private _findContainingOrPreviousGroupToItemIndex1(
    max: number,
    min: number,
    targetIndex: number
  ): { groupIndex: number; contained: boolean } {
    const containedInGroup = (itemIndex: number, group: OffsetGroup) => {
      return itemIndex >= group?.startIndex && itemIndex <= group?.stopIndex;
    };

    let high = max;
    let low = min;
    let middle = 0;

    while (low <= high) {
      middle = low + Math.floor((high - low) / 2);

      const currentGroup = this.m_OffsetGroups[middle];
      const isContainedInGroup = containedInGroup(targetIndex, currentGroup);

      if (isContainedInGroup) {
        return { groupIndex: middle, contained: true };
      } else if (currentGroup.startIndex < targetIndex) {
        low = middle + 1;
      } else if (currentGroup.stopIndex > targetIndex) {
        high = middle - 1;
      }
    }

    if (middle == high) {
      return { groupIndex: middle, contained: false };
    }

    return { groupIndex: middle - 1, contained: false };
    // return { groupIndex: middle - 1, contained: false };
  }

  private _findContainingOrPreviousGroupToItemIndex2(
    high: number,
    low: number,
    targetIndex: number
  ): { groupIndex: number; contained: boolean } {
    const containedInGroup = (itemIndex: number, group: OffsetGroup) => {
      return itemIndex >= group?.startIndex && itemIndex <= group?.stopIndex;
    };

    let middle: number;

    while (low <= high) {
      middle = low + Math.floor((high - low) / 2);

      const currentGroup = this.m_OffsetGroups[middle];
      const isContainedInGroup = containedInGroup(targetIndex, currentGroup);

      if (isContainedInGroup) {
        return { groupIndex: middle, contained: true };
      } else if (currentGroup.startIndex < targetIndex) {
        low = middle + 1;
      } else if (currentGroup.startIndex > targetIndex) {
        high = middle - 1;
      }
    }

    return { groupIndex: middle - 1, contained: false };
  }

  private _getUnmeasuredDeltaItemCount(targetIndex: number, lastMeasuredIndex: number): number {
    let deltaUnmeasuredItemCount = lastMeasuredIndex == -1 ? 0 : targetIndex - lastMeasuredIndex;
    let result = clamp(deltaUnmeasuredItemCount, 0, lastMeasuredIndex);

    return result;
  }
}

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);
