import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import RibbonItem from '../RibbonItem';
import classNames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import selectors from 'selectors';
import actions from 'actions';
import FlexDropdown from '../FlexDropdown';
import { ITEM_TYPE, DIRECTION } from 'constants/customizationVariables';
import ToggleElementButton from '../ToggleElementButton';

import './RibbonGroup.scss';
import sizeManager, { storeSizeHook } from 'helpers/responsivnessHelper';
import { itemToFlyout } from 'helpers/itemToFlyoutHelper';

const DEFAULT_DROPDOWN_HEIGHT = 72;

const validateItems = (items) => {
  items.filter((item, index) => {
    const itemType = item.type || item.props.type;
    if (itemType !== ITEM_TYPE.RIBBON_ITEM) {
      const dataElement = item.dataElement || item.props.dataElement;
      console.warn(`${dataElement} is not a valid ribbon item.`);
    }
    item.sortIndex = index;
    return itemType === ITEM_TYPE.RIBBON_ITEM;
  });
  return items;
};

const RibbonGroup = (props) => {
  const {
    dataElement,
    items,
    headerDirection,
    headerPlacement,
    gap = headerDirection === DIRECTION.COLUMN ? 12 : 20,
    justifyContent,
    grow = 0,
  } = props;
  const [itemsGap, setItemsGap] = useState(gap);
  const [containerWidth, setContainerWidth] = useState(0);
  const [ribbonItems, setRibbonItems] = useState(validateItems(items));
  const [activeCustomRibbon] = useSelector((state) => [
    selectors.getActiveCustomRibbon(state),
  ]);

  const elementRef = useRef();

  const dispatch = useDispatch();

  const FLYOUT_NAME = `${dataElement}-flyout`;

  const size = useSelector((state) => selectors.getCustomElementSize(state, dataElement));
  useEffect(() => {
    sizeManager[dataElement] = {
      ...(sizeManager[dataElement] ? sizeManager[dataElement] : {}),
      canGrow: size > 0,
      canShrink: size < items.length,
      grow: () => {
        const newSize = size - 1;
        dispatch(actions.setCustomElementSize(dataElement, newSize < 0 ? 0 : newSize));
      },
      shrink: () => {
        dispatch(actions.setCustomElementSize(dataElement, size + 1));
      },
      size: size,
    };

    // When size and items length are equal it means flyout is disabled
    // and dropdown is enabled, so flyout needs to be closed.
    if (size === items.length) {
      dispatch(actions.closeElement(FLYOUT_NAME));
    }
  }, [size]);
  storeSizeHook(dataElement, size, elementRef, headerDirection);

  useEffect(() => {
    const flyout = {
      dataElement: FLYOUT_NAME,
      className: 'RibbonGroupFlyout',
      items: [],
    };
    if (size > 0) {
      const activeIndex = ribbonItems.findIndex((item) => item.toolbarGroup === activeCustomRibbon);
      const lastIndex = ribbonItems.length - 1;
      const indexToExcludeFrom = activeIndex >= lastIndex - size ? lastIndex - size : lastIndex - size + 1;
      for (let i = 0; i < ribbonItems.length; i++) {
        const item = ribbonItems[i];
        if (i < indexToExcludeFrom || item.toolbarGroup === activeCustomRibbon) {
          continue;
        }
        const flyoutItem = itemToFlyout(item, {
          onClick: () => {
            dispatch(actions.closeElements([FLYOUT_NAME]));
          },
        });
        if (flyoutItem) {
          flyout.items.push(flyoutItem);
        }
      }
    }
    dispatch(actions.updateFlyout(FLYOUT_NAME, flyout));
    setContainerWidth(elementRef.current?.clientWidth ?? 0);
  }, [size, activeCustomRibbon]);

  useEffect(() => {
    setItemsGap(gap);
  }, [gap]);

  const setActiveCustomRibbon = useCallback(
    (ribbon) => {
      dispatch(actions.setActiveCustomRibbon(ribbon));
    },
    [dispatch],
  );

  useEffect(() => {
    setRibbonItems(validateItems(items));
  }, [items]);

  const renderRibbonItems = () => {
    const activeIndex = ribbonItems.findIndex((item) => item.toolbarGroup === activeCustomRibbon);
    const lastIndex = ribbonItems.length - 1;
    const indexToExcludeFrom = activeIndex >= lastIndex - size ? lastIndex - size : lastIndex - size + 1;
    return ribbonItems.map((item, index) => {
      if (index >= indexToExcludeFrom && item.toolbarGroup !== activeCustomRibbon) {
        return null;
      }
      const itemProps = item.props || item;
      itemProps.direction = headerDirection;
      itemProps.justifyContent = justifyContent;
      return <RibbonItem key={`${dataElement}-${itemProps.dataElement}`} {...itemProps} />;
    }).filter((item) => !!item);
  };

  const getArrowDirection = () => {
    switch (headerPlacement) {
      case 'top':
        return 'down';
      case 'bottom':
        return 'up';
      case 'left':
        return 'right';
      case 'right':
        return 'left';
    }
  };

  if (ribbonItems && ribbonItems.length) {
    return (
      <div ref={elementRef} className={'RibbonGroupContainer'} data-element={dataElement}
        style={{ display: 'flex', flexDirection: headerDirection, justifyContent: justifyContent, flexGrow: grow }}>
        <div
          className={classNames({
            'RibbonGroup': true,
            'hidden': size === items.length,
          })}
          style={{
            gap: `${itemsGap}px`,
            flexDirection: headerDirection,
          }}
        >
          {renderRibbonItems()}
          <div
            className={classNames({
              'RibbonGroup__moreButton': true,
              'hidden': size === 0,
            })}
          >
            <ToggleElementButton
              dataElement="moreRibbonsButton"
              toggleElement={FLYOUT_NAME}
              title="action.more"
              img="icon-tools-more"
            />
          </div>
        </div>
        <div
          className={classNames({
            'RibbonGroup__dropdown': true,
            'hidden': size !== items.length,
          })}
        >
          <FlexDropdown
            dataElement={`${dataElement}Dropdown`}
            width={headerDirection === DIRECTION.COLUMN ? containerWidth : undefined}
            height={headerDirection === DIRECTION.COLUMN ? DEFAULT_DROPDOWN_HEIGHT : undefined}
            direction={headerDirection}
            placement={headerPlacement}
            objects={validateItems(items)}
            objectKey={'toolbarGroup'}
            currentSelectionKey={activeCustomRibbon}
            onClickItem={(customRibbon) => {
              setActiveCustomRibbon(customRibbon);
            }}
            arrowDirection={getArrowDirection()}
          />
        </div>
      </div>
    );
  }

  return null;
};

RibbonGroup.propTypes = {
  dataElement: PropTypes.string,
  items: PropTypes.array,
  overflowLabel: PropTypes.string,
  gap: PropTypes.number,
  headerDirection: PropTypes.string,
};

export default RibbonGroup;
