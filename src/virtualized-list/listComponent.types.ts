import { $Shape } from "utility-types";
import { IScrollable } from "./createListComponent";

export type ScrollToAlign = "auto" | "smart" | "center" | "start" | "end";
export type itemSize =
  | number
  | ((index: number) => number)
  | ((index: number) => { size: number; loaded: boolean });
// TODO Deprecate directions "horizontal" and "vertical"
export type Direction = "ltr" | "rtl" | "horizontal" | "vertical";
export type Layout = "horizontal" | "vertical";
export type RenderComponentProps<T> = {
  data: T;
  index: number;
  isScrolling?: boolean;
  style: Record<string, any>;
};
export type RenderComponent<T> = React.ComponentType<
  $Shape<RenderComponentProps<T>>
>;
export type ScrollDirection = "forward" | "backward";
export type onItemsRenderedCallback = (arg0: {
  overscanStartIndex: number;
  overscanStopIndex: number;
  visibleStartIndex: number;
  visibleStopIndex: number;
}) => void;
export type onScrollCallback = (arg0: {
  scrollDirection: ScrollDirection;
  scrollOffset: number;
  scrollUpdateWasRequested: boolean;
}) => void;
export type ScrollEvent = React.SyntheticEvent<HTMLDivElement>;
export type ItemStyleCache = Record<number, Record<string, any>>;
export type OuterProps = {
  children: React.ReactNode;
  className: string | void;
  onScroll: (arg0: ScrollEvent) => void;
  style: Record<string, unknown>;
};
export type InnerProps = {
  children: React.ReactNode;
  style: Record<string, unknown>;
};

export type Props<T> = {
  children: RenderComponent<T>;
  className?: string;
  direction: Direction;
  height: number | string;
  initialScrollOffset?: number;
  innerRef?: any;
  innerTagName?: string;
  // setRef?: (ref: IScrollable) => void;
  // deprecated
  itemCount: number;
  itemData: T;
  itemKey?: (index: number, data: T) => any;
  itemSize: itemSize;
  layout: Layout;
  onItemsRendered?: onItemsRenderedCallback;
  onForceUpdateLoadedItems(props: Props<any>, startIndex: number, stopIndex: number)
  onScroll?: onScrollCallback;
  outerRef?: any;
  outerTagName?: string;
  // deprecated
  overscanCount: number;
  style?: Record<string, any>;
  useIsScrolling: boolean;
  width: number | string;
};

export type State = {
  instance: any;
  isScrolling: boolean;
  scrollDirection: ScrollDirection;
  scrollOffset: number;
  scrollUpdateWasRequested: boolean;
};
export type GetItemOffset = (
  props: Props<any>,
  index: number,
  instanceProps: any
) => number;
export type GetItemSize = (
  props: Props<any>,
  index: number,
  instanceProps: any
) => number;
export type GetEstimatedTotalSize = (
  props: Props<any>,
  instanceProps: any
) => number;
export type GetOffsetForIndexAndAlignment = (
  props: Props<any>,
  index: number,
  align: ScrollToAlign,
  scrollOffset: number,
  instanceProps: any
) => number;
export type GetStartIndexForOffset = (
  props: Props<any>,
  offset: number,
  instanceProps: any
) => number;
export type GetStopIndexForStartIndex = (
  props: Props<any>,
  startIndex: number,
  scrollOffset: number,
  instanceProps: any
) => number;
export type InitInstanceProps = (props: Props<any>, instance: any) => any;
export type ValidateProps = (props: Props<any>) => void;
