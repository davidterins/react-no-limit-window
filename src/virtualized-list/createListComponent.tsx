import { $Shape } from "utility-types";
import memoizeOne from "memoize-one";
import { createElement, CSSProperties, PureComponent } from "react";
import { cancelTimeout, requestTimeout } from "./timer";
import { getRTLOffsetType } from "./domHelpers";
import type { TimeoutID } from "./timer";
import {
  GetEstimatedTotalSize,
  GetItemOffset,
  GetItemSize,
  GetOffsetForIndexAndAlignment,
  GetStartIndexForOffset,
  GetStopItemInfosForStartIndex,
  InitInstanceProps,
  ItemInfoForOffset,
  ItemMeasurementMeta,
  onItemsRenderedCallback,
  onScrollCallback,
  Props,
  ScrollDirection,
  ScrollEvent,
  ScrollToAlign,
  State,
  ValidateProps,
} from "./listComponent.types";

const IS_SCROLLING_DEBOUNCE_INTERVAL = 150;
const defaultItemKey = (index: number, data: any) => index;

// In DEV mode, this Set helps us only log a warning once per component instance.
// This avoids spamming the console every time a render happens.
let devWarningsDirection = null;
let devWarningsTagName = null;

if (process.env.NODE_ENV !== "production") {
  if (typeof window !== "undefined" && typeof window.WeakSet !== "undefined") {
    devWarningsDirection = new WeakSet();
    devWarningsTagName = new WeakSet();
  }
}

export interface IListView {
  SetViewPort: (clientHeight: number, scrollHeight: number, scrollTop: number) => void;
}
export interface IPreMeasuredForceRender {
  preMeasuredForceRender: (startIndex: number, stopIndex: number) => void;
}

type VisibilityState = "fully-visible" | "start-cut" | "end-cut" | "two-way-cut";

export default function createListComponent({
  getItemOffset,
  getEstimatedTotalSize,
  // getItemSize,
  getOffsetForIndexAndAlignment,
  getStartIndexForOffset,
  getStopIndexForStartIndex,
  initInstanceProps,
  shouldResetStyleCacheOnItemSizeChange,
  validateProps,
}: {
  getItemOffset: GetItemOffset;
  getEstimatedTotalSize: GetEstimatedTotalSize;
  // getItemSize: GetItemSize;
  onloadedItemsRendered(props: Props<any>, startIndex: number, stopIndex: number);
  getOffsetForIndexAndAlignment: GetOffsetForIndexAndAlignment;
  getStartIndexForOffset: GetStartIndexForOffset;
  getStopIndexForStartIndex: GetStopItemInfosForStartIndex;
  initInstanceProps: InitInstanceProps;
  shouldResetStyleCacheOnItemSizeChange: boolean;
  validateProps: ValidateProps;
}) {
  // return class List<T> extends PureComponent<Props<T>, State> {
  return class List<T>
    extends PureComponent<Props<T>, State>
    implements IListView, IPreMeasuredForceRender
  {
    _instanceProps: any = initInstanceProps(this.props, this);
    _outerRef: HTMLDivElement | null | undefined;
    _resetIsScrollingTimeoutId: TimeoutID | null = null;

    static defaultProps = {
      direction: "ltr",
      itemData: undefined,
      layout: "vertical",
      overscanCount: 0,
      useIsScrolling: false,
    };
    state: State = {
      instance: this,
      isScrolling: false,
      scrollDirection: "forward",
      scrollOffset:
        typeof this.props.initialScrollOffset === "number" ? this.props.initialScrollOffset : 0,
      scrollUpdateWasRequested: false,
    };

    // Always use explicit constructor for React components.
    // It produces less code after transpilation. (#26)
    // eslint-disable-next-line no-useless-constructor
    constructor(props: Props<T>) {
      super(props);
      // props.setRef(this);
    }

    public preMeasuredForceRender = (startIndex: number, stopIndex: number) => {
      // this.props.onForceUpdateLoadedItems(this.props, startIndex, stopIndex);
      this.forceUpdate();
    };

    public SetViewPort(clientHeight: number, scrollHeight: number, scrollTop: number) {
      // console.log(`zz SetViewPort: ${clientHeight}, ${scrollHeight}, ${scrollTop}`);
      this._onScrollVertical(clientHeight, scrollHeight, scrollTop);
    }

    static getDerivedStateFromProps<T>(
      nextProps: Props<T>,
      prevState: State
    ): $Shape<State> | null {
      validateSharedProps(nextProps, prevState);
      validateProps(nextProps);
      return null;
    }

    scrollTo(scrollOffset: number): void {
      scrollOffset = Math.max(0, scrollOffset);
      this.setState((prevState) => {
        if (prevState.scrollOffset === scrollOffset) {
          return null;
        }

        return {
          scrollDirection: prevState.scrollOffset < scrollOffset ? "forward" : "backward",
          scrollOffset: scrollOffset,
          scrollUpdateWasRequested: true,
        };
      }, this._resetIsScrollingDebounced);
    }

    ScrollToItem(index: number, align: ScrollToAlign = "auto"): void {
      const { itemCount } = this.props;
      const { scrollOffset } = this.state;
      index = Math.max(0, Math.min(index, itemCount - 1));
      this.scrollTo(
        getOffsetForIndexAndAlignment(this.props, index, align, scrollOffset, this._instanceProps)
      );
    }

    componentDidMount() {
      const { direction, initialScrollOffset, layout } = this.props;
      // console.log("HEREEE " + this.props.outerRef);

      if (typeof initialScrollOffset === "number" && this.props.outerRef != null) {
        const outerRef = this._outerRef as any as HTMLElement;

        // TODO Deprecate direction "horizontal"
        if (direction === "horizontal" || layout === "horizontal") {
          outerRef.scrollLeft = initialScrollOffset;
        } else {
          outerRef.scrollTop = initialScrollOffset;
        }
      }

      this._callPropsCallbacks();
    }

    componentDidUpdate() {
      const { direction, layout } = this.props;
      const { scrollOffset, scrollUpdateWasRequested } = this.state;

      if (scrollUpdateWasRequested && this._outerRef != null) {
        const outerRef = this._outerRef as any as HTMLElement;

        // TODO Deprecate direction "horizontal"
        if (direction === "horizontal" || layout === "horizontal") {
          if (direction === "rtl") {
            // TRICKY According to the spec, scrollLeft should be negative for RTL aligned elements.
            // This is not the case for all browsers though (e.g. Chrome reports values as positive, measured relative to the left).
            // So we need to determine which browser behavior we're dealing with, and mimic it.
            switch (getRTLOffsetType()) {
              case "negative":
                outerRef.scrollLeft = -scrollOffset;
                break;

              case "positive-ascending":
                outerRef.scrollLeft = scrollOffset;
                break;

              default:
                const { clientWidth, scrollWidth } = outerRef;
                outerRef.scrollLeft = scrollWidth - clientWidth - scrollOffset;
                break;
            }
          } else {
            outerRef.scrollLeft = scrollOffset;
          }
        } else {
          outerRef.scrollTop = scrollOffset;
        }
      }

      this._callPropsCallbacks();
    }

    componentWillUnmount() {
      if (this._resetIsScrollingTimeoutId !== null) {
        cancelTimeout(this._resetIsScrollingTimeoutId);
      }
    }

    rangeToRender: [number, number, number, number];

    render() {
      const {
        children: rowElement,
        className,
        direction,
        height,
        innerRef,
        innerTagName,
        itemCount,
        itemData,
        itemKey = defaultItemKey,
        layout,
        outerTagName,
        style,
        useIsScrolling,
        width,
      } = this.props;
      const { isScrolling, scrollOffset } = this.state;
      const viewPortHeight = (height as number) - 4;
      // TODO Deprecate direction "horizontal"
      const isHorizontal = direction === "horizontal" || layout === "horizontal";

      // 1. get offset of first item to render, this should be the only call to getItemOffset
      //    as it is a slow call & needs optimization.
      const [itemMeasurementInfos, startIndex, stopIndex] = this._getRangeToRenderSuper();

      this.rangeToRender = [startIndex, stopIndex, startIndex, stopIndex];

      console.log(`Range to render: ${startIndex} -> ${stopIndex}`, itemMeasurementInfos);

      const items = [];

      const visiblityStates: {
        index: number;
        style: CSSProperties;
        visibleState: VisibilityState;
        projectedStyle: {
          top: number;
          scrollTop: number;
          height: number;
        };
      }[] = [];

      if (itemCount > 0) {
        // for (let index = startIndex; index <= stopIndex; index++) {
        for (let i = 0; i < itemMeasurementInfos.length; i++) {
          const { index, offsetTop, height: itemHeight } = itemMeasurementInfos[i];

          const listItemStyle: CSSProperties = this._getItemStyleSuper(
            index,
            offsetTop,
            itemHeight
          );

          const viewPortStopPixel = scrollOffset + (height as number);
          const listItemStart = listItemStyle.top as number;
          const listItemHeight = listItemStyle.height as number;
          const listItemEnd = listItemStart + listItemHeight;
          // console.warn(
          //   `fx Projected pixels within viewport ${scrollOffset} -> ${viewPortStopPixel}`
          // );

          const startsBeforeViewport = listItemStart < scrollOffset;
          const endsAfterViewPort = listItemEnd > viewPortStopPixel;
          const withinViewPort = !startsBeforeViewport && !endsAfterViewPort;

          const previousRowData = visiblityStates.find((item) => item.index == index - 1);

          if (startsBeforeViewport && !endsAfterViewPort) {
            let projectedStyle = {
              top: 0,
              scrollTop: scrollOffset - listItemStart,
              height: listItemEnd - scrollOffset,
            };

            // Item starts before viewport but ends within.
            visiblityStates.push({
              index,
              style: listItemStyle,
              visibleState: "start-cut",
              projectedStyle: projectedStyle,
            });

            // console.log(
            //   `fx ${index} item ${listItemStart} starts before viewport, but ends ${listItemEnd} within`
            // );
          } else if (withinViewPort) {
            // ok good, item is fully rendered within viewport

            let projectedStyle = {
              top: previousRowData
                ? previousRowData.projectedStyle.top + previousRowData.projectedStyle.height
                : 0, // this should be previous rows end value
              scrollTop: 0,
              height: listItemHeight,
            };

            visiblityStates.push({
              index,
              style: listItemStyle,
              visibleState: "fully-visible",
              projectedStyle: projectedStyle,
            });
          } else if (!startsBeforeViewport && endsAfterViewPort) {
            // Item start is visible in viewport but ends after.
            let projectedStyle = {
              top: previousRowData
                ? previousRowData.projectedStyle.top + previousRowData.projectedStyle.height
                : 0, // this should be previous rows end value
              scrollTop: 0,
              height: scrollOffset + viewPortHeight - listItemStart,
            };

            visiblityStates.push({
              index,
              style: listItemStyle,
              visibleState: "end-cut",
              projectedStyle,
            });
            // console.log(
            //   `fx ${index} item ${listItemStart} start is visible, but ends ${listItemEnd} after`
            // );
          } else {
            // Neither items start or end is visible in viewport.
            let projectedStyle = {
              top: 0,
              scrollTop: scrollOffset - listItemStart,
              height: listItemEnd - scrollOffset,
            };

            visiblityStates.push({
              index,
              style: listItemStyle,
              visibleState: "two-way-cut",
              projectedStyle,
            });
            // console.log(
            //   `fx ${index} neither item's ${listItemStart} start or end ${listItemEnd} is visible in viewport.`
            // );
          }
        }
      }

      if (visiblityStates.filter((s) => s.visibleState == "start-cut").length > 1) {
        console.error("multiple start-cut visibility states in viewport ", visiblityStates);
      }

      // if (visiblityStates.filter((s) => s.visibleState == "end-cut").length > 1) {
      //   console.error("multiple end-cut visibility states in viewport ", visiblityStates);
      // }

      visiblityStates.forEach((item) => {
        const listItemStart = item.style.top as number;

        switch (item.visibleState) {
          case "fully-visible": {
            let li = createElement(rowElement, {
              data: itemData,
              key: itemKey(item.index, itemData),
              index: item.index,
              isScrolling: useIsScrolling ? isScrolling : undefined,
              style: { ...item.style, ...item.projectedStyle },
            });

            items.push(li);
            break;
          }
          case "start-cut": {
            let li = createElement(rowElement, {
              data: itemData,
              key: itemKey(item.index, itemData),
              index: item.index,
              isScrolling: useIsScrolling ? isScrolling : undefined,
              style: { ...item.style, position: "relative", top: 0 },
            });

            const listItemProjection = createElement("div", {
              id: "start-cut-projected-li",
              data: itemData,
              ref: (ref: Element) => {
                // console.error(ref);
                if (ref) {
                  ref.scrollTop = scrollOffset - listItemStart;
                }
              },
              key: itemKey(item.index, itemData),
              index: item.index,
              isScrolling: useIsScrolling ? isScrolling : undefined,
              style: {
                ...item.style,
                ...item.projectedStyle,
                overflow: "hidden",
              },
              children: li,
            });

            items.push(listItemProjection);
            break;
          }
          case "end-cut":
            let li = createElement(rowElement, {
              data: itemData,
              key: itemKey(item.index, itemData),
              index: item.index,
              isScrolling: useIsScrolling ? isScrolling : undefined,
              style: { ...item.style, position: "relative", top: 0 },
            });

            const listItemProjection = createElement("div", {
              id: "end-cut-projected-li",
              data: itemData,
              ref: (ref: Element) => {
                // console.error(ref);
                if (ref) {
                  ref.scrollTop = 0;
                }
              },
              key: itemKey(item.index, itemData),
              index: item.index,
              isScrolling: useIsScrolling ? isScrolling : undefined,
              style: {
                ...item.style,
                ...item.projectedStyle,
                overflow: "hidden",
              },
              children: li,
            });

            items.push(listItemProjection);
            break;
          case "two-way-cut": {
            let li = createElement(rowElement, {
              data: itemData,
              key: itemKey(item.index, itemData),
              index: item.index,
              isScrolling: useIsScrolling ? isScrolling : undefined,
              style: { ...item.style, position: "relative", top: 0 },
            });

            const listItemProjection = createElement("div", {
              id: "start-cut-projected-li",
              data: itemData,
              ref: (ref: Element) => {
                // console.error(ref);
                if (ref) {
                  ref.scrollTop = scrollOffset - listItemStart;
                }
              },
              key: itemKey(item.index, itemData),
              index: item.index,
              isScrolling: useIsScrolling ? isScrolling : undefined,
              style: {
                ...item.style,
                ...item.projectedStyle,
                overflow: "hidden",
              },
              children: li,
            });

            items.push(listItemProjection);
            break;
          }
          default:
            break;
        }
      });

      // Read this value AFTER items have been created,
      // So their actual sizes (if variable) are taken into consideration.
      const estimatedTotalSize = getEstimatedTotalSize(this.props, this._instanceProps);

      let containerStyle: CSSProperties = {
        height: "100%",
        width: "100%",
        pointerEvents: isScrolling ? "none" : undefined,
      };

      let virtualizedItemsContainer = createElement("div", {
        id: "virtualized-items-container",
        children: items,
        ref: innerRef,
        style: containerStyle,
      });

      return virtualizedItemsContainer;
    }

    _callOnItemsRendered = memoizeOne(
      (
        overscanStartIndex: number,
        overscanStopIndex: number,
        visibleStartIndex: number,
        visibleStopIndex: number
      ) =>
        (this.props.onItemsRendered as any as onItemsRenderedCallback)({
          overscanStartIndex,
          overscanStopIndex,
          visibleStartIndex,
          visibleStopIndex,
        })
    );

    _callOnScroll = memoizeOne(
      (scrollDirection: ScrollDirection, scrollOffset: number, scrollUpdateWasRequested: boolean) =>
        (this.props.onScroll as any as onScrollCallback)({
          scrollDirection,
          scrollOffset,
          scrollUpdateWasRequested,
        })
    );

    _callPropsCallbacks() {
      if (typeof this.props.onItemsRendered === "function") {
        const { itemCount } = this.props;

        if (itemCount > 0) {
          const [overscanStartIndex, overscanStopIndex, visibleStartIndex, visibleStopIndex] =
            this.rangeToRender; // <- this save a lot of performance this._getRangeToRender();

          console.debug(
            "Call on Items rendered: TODO LOOK INTO THIS METHOD AS IT IS EXPENSIVE!!!",
            {
              visibleStartIndex,
              visibleStopIndex,
            }
          );
          this._callOnItemsRendered(
            overscanStartIndex,
            overscanStopIndex,
            visibleStartIndex,
            visibleStopIndex
          );
        }
      }

      if (typeof this.props.onScroll === "function") {
        const { scrollDirection, scrollOffset, scrollUpdateWasRequested } = this.state;

        this._callOnScroll(scrollDirection, scrollOffset, scrollUpdateWasRequested);
      }
    }

    _getItemStyleSuper = (
      index: number,
      offsetTop: number,
      height: number
    ): Record<string, any> => {
      const { direction, layout } = this.props;

      shouldResetStyleCacheOnItemSizeChange = true;

      const itemStyleCache = this._getItemStyleCache(
        shouldResetStyleCacheOnItemSizeChange && height,
        shouldResetStyleCacheOnItemSizeChange && layout,
        shouldResetStyleCacheOnItemSizeChange && direction
      );

      // console.log("Item style cache:", itemStyleCache);

      let style;

      // if (
      //   itemStyleCache.hasOwnProperty(index) &&
      //   itemStyleCache[index].height != 100
      // ) {
      //   style = itemStyleCache[index];
      //   // console.log(`${index} styleCache`, style.height);
      // } else
      {
        const offset = offsetTop;
        const size = height;

        // Use commented code below to prove performance difference.
        // const offset = index * 100; // getItemOffset(this.props, index, this._instanceProps);
        // const size = 100; // getItemSize(this.props, index, this._instanceProps);

        // console.log(`${index} size post search`, {
        //   offset: offset,
        //   size: size,
        // });
        // TODO Deprecate direction "horizontal"
        const isHorizontal = direction === "horizontal" || layout === "horizontal";

        const isRtl = direction === "rtl";
        const offsetHorizontal = isHorizontal ? offset : 0;

        // Update item style cache
        itemStyleCache[index] = style = {
          position: "absolute",
          left: isRtl ? undefined : offsetHorizontal,
          right: isRtl ? offsetHorizontal : undefined,
          top: !isHorizontal ? offset : 0,
          // position: "relative",
          height: !isHorizontal ? size : "100%",
          // height: !isHorizontal ? k.size : "100%",
          width: isHorizontal ? size : "100%",
        };
      }

      return style;
    };

    // // Lazily create and cache item styles while scrolling,
    // // So that pure component sCU will prevent re-renders.
    // // We maintain this cache, and pass a style prop rather than index,
    // // So that List can clear cached styles and force item re-render if necessary.
    // // _getItemStyle: (index: number) => Record<string, any>;
    // _getItemStyle = (index: number): Record<string, any> => {
    //   const { direction, itemSize, layout } = this.props;

    //   // console.log("ItemSize", itemSize);

    //   if (typeof itemSize == "function") {
    //     // TODO: this replace this call;
    //     var k = itemSize(index) as any;
    //     // console.log(`${index} ItemSize`, k.size);
    //     // console.log(`${index} ItemSize`, k);
    //   }

    //   shouldResetStyleCacheOnItemSizeChange = true;

    //   const itemStyleCache = this._getItemStyleCache(
    //     shouldResetStyleCacheOnItemSizeChange && k.size,
    //     shouldResetStyleCacheOnItemSizeChange && layout,
    //     shouldResetStyleCacheOnItemSizeChange && direction
    //   );

    //   // console.log("Item style cache:", itemStyleCache);

    //   let style;

    //   if (
    //     itemStyleCache.hasOwnProperty(index) &&
    //     itemStyleCache[index].height != 100
    //   ) {
    //     style = itemStyleCache[index];
    //     // console.log(`${index} styleCache`, style.height);
    //   } else {
    //     // TODO: AVOID GetItemMetaData calls here as they are expensive!
    //     const offset = getItemOffset(this.props, index, this._instanceProps);
    //     const size = getItemSize(this.props, index, this._instanceProps);

    //     // Use commented code below to prove performance difference.
    //     // const offset = index * 100; // getItemOffset(this.props, index, this._instanceProps);
    //     // const size = 100; // getItemSize(this.props, index, this._instanceProps);

    //     console.log(`${index} size post search`, {
    //       offset: offset,
    //       size: size,
    //     });
    //     // TODO Deprecate direction "horizontal"
    //     const isHorizontal =
    //       direction === "horizontal" || layout === "horizontal";

    //     const isRtl = direction === "rtl";
    //     const offsetHorizontal = isHorizontal ? offset : 0;

    //     // Update item style cache
    //     itemStyleCache[index] = style = {
    //       position: "absolute",
    //       left: isRtl ? undefined : offsetHorizontal,
    //       right: isRtl ? offsetHorizontal : undefined,
    //       top: !isHorizontal ? offset : 0,
    //       // position: "relative",
    //       height: !isHorizontal ? size : "100%",
    //       // height: !isHorizontal ? k.size : "100%",
    //       width: isHorizontal ? size : "100%",
    //     };
    //   }

    //   return style;
    // };

    _getItemStyleCache = memoizeOne((_: any, __: any, ___: any) => ({}));

    _getRangeToRender(): [number, number, number, number] {
      const { itemCount, overscanCount } = this.props;
      const { isScrolling, scrollDirection, scrollOffset } = this.state;
      if (itemCount === 0) {
        return [0, 0, 0, 0];
      }

      const startItemInfo = getStartIndexForOffset(this.props, scrollOffset, this._instanceProps);

      const { index: startItemIndex } = startItemInfo;

      const stopItemInfos = getStopIndexForStartIndex(
        this.props,
        startItemInfo,
        scrollOffset,
        this._instanceProps
      );
      // Overscan by one item in each direction so that tab/focus works.
      // If there isn't at least one extra item, tab loops back around.
      const overscanBackward = 0;
      // !isScrolling || scrollDirection === "backward"
      //   ? Math.max(1, overscanCount)
      //   : 1;
      const overscanForward = 0;
      // !isScrolling || scrollDirection === "forward"
      //   ? Math.max(1, overscanCount)
      //   : 1;
      return [
        Math.max(0, startItemIndex - overscanBackward),
        Math.max(0, Math.min(itemCount - 1, stopItemInfos.stopIndex + overscanForward)),
        startItemIndex,
        stopItemInfos.stopIndex,
      ];
    }

    _getRangeToRenderSuper(): [ItemInfoForOffset[], number, number, number, number] {
      const { itemCount, overscanCount } = this.props;
      const { isScrolling, scrollDirection, scrollOffset } = this.state;
      if (itemCount === 0) {
        return [[], 0, 0, 0, 0];
      }

      const startItemInfo = getStartIndexForOffset(this.props, scrollOffset, this._instanceProps);

      const { index: startItemIndex } = startItemInfo;

      const stopItemInfos = getStopIndexForStartIndex(
        this.props,
        startItemInfo,
        scrollOffset,
        this._instanceProps
      );

      // Overscan by one item in each direction so that tab/focus works.
      // If there isn't at least one extra item, tab loops back around.
      const overscanBackward = 0;
      // !isScrolling || scrollDirection === "backward"
      //   ? Math.max(1, overscanCount)
      //   : 1;
      const overscanForward = 0;
      // !isScrolling || scrollDirection === "forward"
      //   ? Math.max(1, overscanCount)
      //   : 1;
      return [
        stopItemInfos.itemMeasurementInfos,
        Math.max(0, startItemIndex - overscanBackward),
        Math.max(0, Math.min(itemCount - 1, stopItemInfos.stopIndex + overscanForward)),
        startItemIndex,
        stopItemInfos.stopIndex,
      ];
    }

    _onScrollHorizontal = (event: ScrollEvent): void => {
      const { clientWidth, scrollLeft, scrollWidth } = event.currentTarget;
      this.setState((prevState) => {
        if (prevState.scrollOffset === scrollLeft) {
          // Scroll position may have been updated by cDM/cDU,
          // In which case we don't need to trigger another render,
          // And we don't want to update state.isScrolling.
          return null;
        }

        const { direction } = this.props;
        let scrollOffset = scrollLeft;

        if (direction === "rtl") {
          // TRICKY According to the spec, scrollLeft should be negative for RTL aligned elements.
          // This is not the case for all browsers though (e.g. Chrome reports values as positive, measured relative to the left).
          // It's also easier for this component if we convert offsets to the same format as they would be in for ltr.
          // So the simplest solution is to determine which browser behavior we're dealing with, and convert based on it.
          switch (getRTLOffsetType()) {
            case "negative":
              scrollOffset = -scrollLeft;
              break;

            case "positive-descending":
              scrollOffset = scrollWidth - clientWidth - scrollLeft;
              break;
          }
        }

        // Prevent Safari's elastic scrolling from causing visual shaking when scrolling past bounds.
        scrollOffset = Math.max(0, Math.min(scrollOffset, scrollWidth - clientWidth));
        return {
          isScrolling: true,
          scrollDirection: prevState.scrollOffset < scrollLeft ? "forward" : "backward",
          scrollOffset,
          scrollUpdateWasRequested: false,
        };
      }, this._resetIsScrollingDebounced);
    };

    _onScrollVertical = (clientHeight: number, scrollHeight: number, scrollTop: number): void => {
      // const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;

      this.setState((prevState) => {
        if (prevState.scrollOffset === scrollTop) {
          // Scroll position may have been updated by cDM/cDU,
          // In which case we don't need to trigger another render,
          // And we don't want to update state.isScrolling.
          return null;
        }

        // console.log("ON_SCROLL_VERTICAL_SETTING_STATE");
        // Prevent Safari's elastic scrolling from causing visual shaking when scrolling past bounds.
        const scrollOffset = Math.max(0, Math.min(scrollTop, scrollHeight - clientHeight));

        // console.log({ clientHeight, scrollHeight, scrollTop, scrollOffset });

        return {
          isScrolling: true,
          scrollDirection: prevState.scrollOffset < scrollOffset ? "forward" : "backward",
          scrollOffset,
          scrollUpdateWasRequested: false,
        };
      }, this._resetIsScrollingDebounced);
    };

    _outerRefSetter = (ref: any): void => {
      const { outerRef } = this.props;
      this._outerRef = ref as any as HTMLDivElement;

      if (typeof outerRef === "function") {
        outerRef(ref);
      } else if (
        outerRef != null &&
        typeof outerRef === "object" &&
        outerRef.hasOwnProperty("current")
      ) {
        outerRef.current = ref;
      }
    };

    _resetIsScrollingDebounced = () => {
      if (this._resetIsScrollingTimeoutId !== null) {
        cancelTimeout(this._resetIsScrollingTimeoutId);
      }

      this._resetIsScrollingTimeoutId = requestTimeout(
        this._resetIsScrolling,
        IS_SCROLLING_DEBOUNCE_INTERVAL
      );
    };

    _resetIsScrolling = () => {
      this._resetIsScrollingTimeoutId = null;
      this.setState(
        {
          isScrolling: false,
        },
        () => {
          // Clear style cache after state update has been committed.
          // This way we don't break pure sCU for items that don't use isScrolling param.
          this._getItemStyleCache(-1, null, null);
        }
      );
    };
  };
}

// NOTE: I considered further wrapping individual items with a pure ListItem component.
// This would avoid ever calling the render function for the same index more than once,
// But it would also add the overhead of a lot of components/fibers.
// I assume people already do this (render function returning a class component),
// So my doing it would just unnecessarily double the wrappers.

const validateSharedProps = (
  { children, direction, height, layout, innerTagName, outerTagName, width }: Props<any>,
  { instance }: State
): void => {
  if (process.env.NODE_ENV !== "production") {
    if (innerTagName != null || outerTagName != null) {
      if (devWarningsTagName && !devWarningsTagName.has(instance)) {
        devWarningsTagName.add(instance);
        console.warn(
          "The innerTagName and outerTagName props have been deprecated. " +
            "Please use the innerElementType and outerElementType props instead."
        );
      }
    }

    // TODO Deprecate direction "horizontal"
    const isHorizontal = direction === "horizontal" || layout === "horizontal";

    switch (direction) {
      case "horizontal":
      case "vertical":
        if (devWarningsDirection && !devWarningsDirection.has(instance)) {
          devWarningsDirection.add(instance);
          console.warn(
            'The direction prop should be either "ltr" (default) or "rtl". ' +
              'Please use the layout prop to specify "vertical" (default) or "horizontal" orientation.'
          );
        }

        break;

      case "ltr":
      case "rtl":
        // Valid values
        break;

      default:
        throw Error(
          'An invalid "direction" prop has been specified. ' +
            'Value should be either "ltr" or "rtl". ' +
            `"${direction}" was specified.`
        );
    }

    switch (layout) {
      case "horizontal":
      case "vertical":
        // Valid values
        break;

      default:
        throw Error(
          'An invalid "layout" prop has been specified. ' +
            'Value should be either "horizontal" or "vertical". ' +
            `"${layout}" was specified.`
        );
    }

    if (children == null) {
      throw Error(
        'An invalid "children" prop has been specified. ' +
          "Value should be a React component. " +
          `"${children === null ? "null" : typeof children}" was specified.`
      );
    }

    if (isHorizontal && typeof width !== "number") {
      throw Error(
        'An invalid "width" prop has been specified. ' +
          "Horizontal lists must specify a number for width. " +
          `"${width === null ? "null" : typeof width}" was specified.`
      );
    } else if (!isHorizontal && typeof height !== "number") {
      // throw Error(
      //   'An invalid "height" prop has been specified. ' +
      //     "Vertical lists must specify a number for height. " +
      //     `"${height === null ? "null" : typeof height}" was specified.`
      // );
    }
  }
};
