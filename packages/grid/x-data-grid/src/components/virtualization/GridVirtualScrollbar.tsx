import * as React from 'react';
import { styled } from '@mui/system';
import {
  unstable_composeClasses as composeClasses,
  unstable_useForkRef as useForkRef,
  unstable_useEventCallback as useEventCallback,
} from '@mui/utils';
import { useOnMount } from '../../hooks/utils/useOnMount';
import { useGridPrivateApiContext } from '../../hooks/utils/useGridPrivateApiContext';
import { gridDimensionsSelector, useGridSelector } from '../../hooks';
import { useGridRootProps } from '../../hooks/utils/useGridRootProps';
import { getDataGridUtilityClass } from '../../constants/gridClasses';
import { DataGridProcessedProps } from '../../models/props/DataGridProps';

type Position = 'vertical' | 'horizontal';
type OwnerState = DataGridProcessedProps;
type GridVirtualScrollbarProps = { position: Position };

const useUtilityClasses = (ownerState: OwnerState, position: Position) => {
  const { classes } = ownerState;

  const slots = {
    root: ['scrollbar', `scrollbar--${position}`],
    content: ['scrollbarContent'],
  };

  return composeClasses(slots, getDataGridUtilityClass, classes);
};

const Scrollbar = styled('div')({
  position: 'absolute',
  display: 'inline-block',
  zIndex: 6,
  '& > div': {
    display: 'inline-block',
  },
});

const ScrollbarVertical = styled(Scrollbar)({
  width: 'var(--DataGrid-scrollbarSize)',
  height:
    'calc(100% - var(--DataGrid-topContainerHeight) - var(--DataGrid-bottomContainerHeight) - var(--DataGrid-hasScrollY) * var(--DataGrid-scrollbarSize))',
  overflowY: 'scroll',
  overflowX: 'hidden',
  '& > div': {
    width: 'var(--DataGrid-scrollbarSize)',
  },
  top: 'var(--DataGrid-topContainerHeight)',
  right: '0px',
});

const ScrollbarHorizontal = styled(Scrollbar)({
  width: '100%',
  height: 'var(--DataGrid-scrollbarSize)',
  overflowY: 'hidden',
  overflowX: 'scroll',
  '& > div': {
    height: 'var(--DataGrid-scrollbarSize)',
  },
  bottom: '0px',
});

const Content = styled('div')({
  display: 'inline-block',
});

const GridVirtualScrollbar = React.forwardRef<HTMLDivElement, GridVirtualScrollbarProps>(
  function GridVirtualScrollbar(props, ref) {
    const apiRef = useGridPrivateApiContext();
    const rootProps = useGridRootProps();
    const isLocked = React.useRef(false);
    const lastPosition = React.useRef(0);
    const scrollbarRef = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const classes = useUtilityClasses(rootProps, props.position);
    const dimensions = useGridSelector(apiRef, gridDimensionsSelector);

    const propertyDimension = props.position === 'vertical' ? 'height' : 'width';
    const propertyScroll = props.position === 'vertical' ? 'scrollTop' : 'scrollLeft';

    const scrollbarSize =
      props.position === 'vertical'
        ? dimensions.viewportInnerSize.height
        : dimensions.viewportOuterSize.width;
    const scrollbarContentSize =
      scrollbarSize *
      (dimensions.contentSize[propertyDimension] / dimensions.viewportOuterSize[propertyDimension]);

    const scrollerContentSize =
      props.position === 'vertical'
        ? dimensions.contentSize.height +
          dimensions.topContainerHeight +
          dimensions.bottomContainerHeight
        : dimensions.contentSize.width;

    const onScrollerScroll = useEventCallback(() => {
      const scroller = apiRef.current.virtualScrollerRef.current!;
      const scrollbar = scrollbarRef.current!;

      if (scroller[propertyScroll] === lastPosition.current) {
        return;
      }

      if (isLocked.current) {
        isLocked.current = false;
        return;
      }
      isLocked.current = true;

      const value = scroller[propertyScroll] / scrollerContentSize;
      scrollbar[propertyScroll] = value * scrollbarContentSize;

      lastPosition.current = scroller[propertyScroll];
    });

    const onScrollbarScroll = useEventCallback(() => {
      const scroller = apiRef.current.virtualScrollerRef.current!;
      const scrollbar = scrollbarRef.current!;

      if (isLocked.current) {
        isLocked.current = false;
        return;
      }
      isLocked.current = true;

      const value = scrollbar[propertyScroll] / scrollbarContentSize;
      scroller[propertyScroll] = value * scrollerContentSize;
    });

    useOnMount(() => {
      const scroller = apiRef.current.virtualScrollerRef.current!;
      const scrollbar = scrollbarRef.current!;
      scroller.addEventListener('scroll', onScrollerScroll, { capture: true });
      scrollbar.addEventListener('scroll', onScrollbarScroll, { capture: true });
      return () => {
        scroller.removeEventListener('scroll', onScrollerScroll, { capture: true });
        scrollbar.removeEventListener('scroll', onScrollbarScroll, { capture: true });
      };
    });

    React.useEffect(() => {
      const content = contentRef.current!;
      content.style.setProperty(propertyDimension, `${scrollbarContentSize}px`);
    }, [scrollbarContentSize]);

    const Container = props.position === 'vertical' ? ScrollbarVertical : ScrollbarHorizontal;

    return (
      <Container ref={useForkRef(ref, scrollbarRef)} className={classes.root}>
        <Content ref={contentRef} className={classes.content} />
      </Container>
    );
  },
);

export { GridVirtualScrollbar };
