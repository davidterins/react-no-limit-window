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
  GetStopIndexForStartIndex,
  InitInstanceProps,
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

export interface IScrollable {
  Scrolla: (
    clientHeight: number,
    scrollHeight: number,
    scrollTop: number
  ) => void;
}

export default function createListComponent({
  getItemOffset,
  getEstimatedTotalSize,
  getItemSize,
  getOffsetForIndexAndAlignment,
  getStartIndexForOffset,
  getStopIndexForStartIndex,
  initInstanceProps,
  shouldResetStyleCacheOnItemSizeChange,
  validateProps,
}: {
  getItemOffset: GetItemOffset;
  getEstimatedTotalSize: GetEstimatedTotalSize;
  getItemSize: GetItemSize;
  getOffsetForIndexAndAlignment: GetOffsetForIndexAndAlignment;
  getStartIndexForOffset: GetStartIndexForOffset;
  getStopIndexForStartIndex: GetStopIndexForStartIndex;
  initInstanceProps: InitInstanceProps;
  shouldResetStyleCacheOnItemSizeChange: boolean;
  validateProps: ValidateProps;
}) {
  // return class List<T> extends PureComponent<Props<T>, State> {
  return class List<T>
    extends PureComponent<Props<T>, State>
    implements IScrollable
  {
    _instanceProps: any = initInstanceProps(this.props, this);
    _outerRef: HTMLDivElement | null | undefined;
    _resetIsScrollingTimeoutId: TimeoutID | null = null;

    static defaultProps = {
      direction: "ltr",
      itemData: undefined,
      layout: "vertical",
      overscanCount: 2,
      useIsScrolling: false,
    };
    state: State = {
      instance: this,
      isScrolling: false,
      scrollDirection: "forward",
      scrollOffset:
        typeof this.props.initialScrollOffset === "number"
          ? this.props.initialScrollOffset
          : 0,
      scrollUpdateWasRequested: false,
    };

    // Always use explicit constructor for React components.
    // It produces less code after transpilation. (#26)
    // eslint-disable-next-line no-useless-constructor
    constructor(props: Props<T>) {
      super(props);
      props.setRef(this);
    }


    public Scrolla(
      clientHeight: number,
      scrollHeight: number,
      scrollTop: number
    ) {
      this._onScrollVertical(clientHeight, scrollHeight, scrollTop);
      // console.log("hej");
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
          scrollDirection:
            prevState.scrollOffset < scrollOffset ? "forward" : "backward",
          scrollOffset: scrollOffset,
          scrollUpdateWasRequested: true,
        };
      }, this._resetIsScrollingDebounced);
    }

    scrollToItem(index: number, align: ScrollToAlign = "auto"): void {
      const { itemCount } = this.props;
      const { scrollOffset } = this.state;
      index = Math.max(0, Math.min(index, itemCount - 1));
      this.scrollTo(
        getOffsetForIndexAndAlignment(
          this.props,
          index,
          align,
          scrollOffset,
          this._instanceProps
        )
      );
    }

    componentDidMount() {
      const { direction, initialScrollOffset, layout } = this.props;
      console.log("HEREEE " + this.props.outerRef);

      if (
        typeof initialScrollOffset === "number" &&
        this.props.outerRef != null
      ) {
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

    render() {
      const {
        children,
        className,
        direction,
        // height,
        innerRef,
        // innerElementType,
        innerTagName,
        itemCount,
        itemData,
        itemKey = defaultItemKey,
        layout,
        // outerElementType,
        outerTagName,
        style,
        useIsScrolling,
        width,
      } = this.props;
      const { isScrolling } = this.state;
      // TODO Deprecate direction "horizontal"
      const isHorizontal =
        direction === "horizontal" || layout === "horizontal";
      const onScrollz = isHorizontal
        ? this._onScrollHorizontal
        : this._onScrollVertical;

      const [startIndex, stopIndex] = this._getRangeToRender();

      // (handleScroll) => {
      //   return this._onScrollVertical(null);
      // };

      const items = [];

      if (itemCount > 0) {
        for (let index = startIndex; index <= stopIndex; index++) {
          items.push(
            createElement(children, {
              data: itemData,
              key: itemKey(index, itemData),
              index,
              isScrolling: useIsScrolling ? isScrolling : undefined,
              style: this._getItemStyle(index),
            })
          );
        }
      }

      // Read this value AFTER items have been created,
      // So their actual sizes (if variable) are taken into consideration.
      const estimatedTotalSize = getEstimatedTotalSize(
        this.props,
        this._instanceProps
      );

      const stylez: CSSProperties = {
        position: "relative",
        // height: height,
        width: width,
        overflow: "auto",
        marginRight: "-17px",
        WebkitOverflowScrolling: "touch",
        willChange: "transform",
        ...style,
      };

      let reactWindowElements = createElement(
        outerTagName || "div",
        {
          id: "list-outer-scrollbar-element",
          className,
          onScrollz,
          ref: this._outerRefSetter,
          style: {
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: -17,
            overflow: "auto",
            WebkitOverflowScrolling: "touch",
            willChange: "transform",
            direction,
            ...style,
          },
        },
        createElement(innerTagName || "div", {
          id: "list-items-container",
          children: items,
          ref: innerRef,
          style: {
            height: "100%",
            // height: isHorizontal ? "100%" : estimatedTotalSize,
            pointerEvents: isScrolling ? "none" : undefined,
            width: isHorizontal ? estimatedTotalSize : "100%",
          },
        })
      );

      let listContainer = createElement(outerTagName || "div", {
        id: "list-outer-element",
        className,
        // onScrollz,
        ref: this._outerRefSetter,
        style: {
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: -17,
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          willChange: "transform",
          direction,
          ...style,
        },
      });

      let listInner = createElement(innerTagName || "div", {
        id: "list-inner-element",
        children: items,
        ref: innerRef,
        style: {
          height: "100%",
          // height: isHorizontal ? "100%" : estimatedTotalSize,
          pointerEvents: isScrolling ? "none" : undefined,
          width: isHorizontal ? estimatedTotalSize : "100%",
        },
      });

      return listInner; // reactWindowElements;
      // <Scrollbar
      //   virtualizedScrollHeight={1000000}
      //   renderView={() => listContainer}
      //   onScroll={onScrollz}
      // >
      // {
      /* {reactWindowElements} */
      // }
      // {listInner}
      // hej
      // <div style={{ height: 1000000 }} />
      // då
      // </Scrollbar>
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
      (
        scrollDirection: ScrollDirection,
        scrollOffset: number,
        scrollUpdateWasRequested: boolean
      ) =>
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
          const [
            overscanStartIndex,
            overscanStopIndex,
            visibleStartIndex,
            visibleStopIndex,
          ] = this._getRangeToRender();

          this._callOnItemsRendered(
            overscanStartIndex,
            overscanStopIndex,
            visibleStartIndex,
            visibleStopIndex
          );
        }
      }

      if (typeof this.props.onScroll === "function") {
        const { scrollDirection, scrollOffset, scrollUpdateWasRequested } =
          this.state;

        this._callOnScroll(
          scrollDirection,
          scrollOffset,
          scrollUpdateWasRequested
        );
      }
    }

    // Lazily create and cache item styles while scrolling,
    // So that pure component sCU will prevent re-renders.
    // We maintain this cache, and pass a style prop rather than index,
    // So that List can clear cached styles and force item re-render if necessary.
    // _getItemStyle: (index: number) => Record<string, any>;
    _getItemStyle = (index: number): Record<string, any> => {
      const { direction, itemSize, layout } = this.props;

      const itemStyleCache = this._getItemStyleCache(
        shouldResetStyleCacheOnItemSizeChange && itemSize,
        shouldResetStyleCacheOnItemSizeChange && layout,
        shouldResetStyleCacheOnItemSizeChange && direction
      );

      let style;

      if (itemStyleCache.hasOwnProperty(index)) {
        style = itemStyleCache[index];
      } else {
        const offset = getItemOffset(this.props, index, this._instanceProps);
        const size = getItemSize(this.props, index, this._instanceProps);
        // TODO Deprecate direction "horizontal"
        const isHorizontal =
          direction === "horizontal" || layout === "horizontal";
        const isRtl = direction === "rtl";
        const offsetHorizontal = isHorizontal ? offset : 0;
        itemStyleCache[index] = style = {
          position: "absolute",
          left: isRtl ? undefined : offsetHorizontal,
          right: isRtl ? offsetHorizontal : undefined,
          top: !isHorizontal ? offset : 0,
          height: !isHorizontal ? size : "100%",
          width: isHorizontal ? size : "100%",
        };
      }

      return style;
    };
    // _getItemStyleCache: (_: any, __: any, ___: any) => ItemStyleCache;
    _getItemStyleCache = memoizeOne((_: any, __: any, ___: any) => ({}));

    _getRangeToRender(): [number, number, number, number] {
      const { itemCount, overscanCount } = this.props;
      const { isScrolling, scrollDirection, scrollOffset } = this.state;

      if (itemCount === 0) {
        return [0, 0, 0, 0];
      }

      const startIndex = getStartIndexForOffset(
        this.props,
        scrollOffset,
        this._instanceProps
      );
      const stopIndex = getStopIndexForStartIndex(
        this.props,
        startIndex,
        scrollOffset,
        this._instanceProps
      );
      // Overscan by one item in each direction so that tab/focus works.
      // If there isn't at least one extra item, tab loops back around.
      const overscanBackward =
        !isScrolling || scrollDirection === "backward"
          ? Math.max(1, overscanCount)
          : 1;
      const overscanForward =
        !isScrolling || scrollDirection === "forward"
          ? Math.max(1, overscanCount)
          : 1;
      return [
        Math.max(0, startIndex - overscanBackward),
        Math.max(0, Math.min(itemCount - 1, stopIndex + overscanForward)),
        startIndex,
        stopIndex,
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
        scrollOffset = Math.max(
          0,
          Math.min(scrollOffset, scrollWidth - clientWidth)
        );
        return {
          isScrolling: true,
          scrollDirection:
            prevState.scrollOffset < scrollLeft ? "forward" : "backward",
          scrollOffset,
          scrollUpdateWasRequested: false,
        };
      }, this._resetIsScrollingDebounced);
    };

    _onScrollVertical = (
      clientHeight: number,
      scrollHeight: number,
      scrollTop: number
    ): void => {
      // const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
      console.log({ clientHeight, scrollHeight, scrollTop });
      this.setState((prevState) => {
        if (prevState.scrollOffset === scrollTop) {
          // Scroll position may have been updated by cDM/cDU,
          // In which case we don't need to trigger another render,
          // And we don't want to update state.isScrolling.
          return null;
        }

        console.log("ON_SCROLL_VERTICAL_SETTING_STATE");
        // Prevent Safari's elastic scrolling from causing visual shaking when scrolling past bounds.
        const scrollOffset = Math.max(
          0,
          Math.min(scrollTop, scrollHeight - clientHeight)
        );

        return {
          isScrolling: true,
          scrollDirection:
            prevState.scrollOffset < scrollOffset ? "forward" : "backward",
          scrollOffset,
          scrollUpdateWasRequested: false,
        };
      }, this._resetIsScrollingDebounced);
    };

    _onScrollVerticalOG = (event: ScrollEvent): void => {
      const { clientHeight, scrollHeight, scrollTop } = event.currentTarget;
      console.log({ clientHeight, scrollHeight, scrollTop });

      this.setState((prevState) => {
        if (prevState.scrollOffset === scrollTop) {
          // Scroll position may have been updated by cDM/cDU,
          // In which case we don't need to trigger another render,
          // And we don't want to update state.isScrolling.
          return null;
        }

        console.log("ON_SCROLL_VERTICAL_SETTING_STATE");
        // Prevent Safari's elastic scrolling from causing visual shaking when scrolling past bounds.
        const scrollOffset = Math.max(
          0,
          Math.min(scrollTop, scrollHeight - clientHeight)
        );
        return {
          isScrolling: true,
          scrollDirection:
            prevState.scrollOffset < scrollOffset ? "forward" : "backward",
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
} // NOTE: I considered further wrapping individual items with a pure ListItem component.
// This would avoid ever calling the render function for the same index more than once,
// But it would also add the overhead of a lot of components/fibers.
// I assume people already do this (render function returning a class component),
// So my doing it would just unnecessarily double the wrappers.

const validateSharedProps = (
  {
    children,
    direction,
    height,
    layout,
    innerTagName,
    outerTagName,
    width,
  }: Props<any>,
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
      throw Error(
        'An invalid "height" prop has been specified. ' +
          "Vertical lists must specify a number for height. " +
          `"${height === null ? "null" : typeof height}" was specified.`
      );
    }
  }
};