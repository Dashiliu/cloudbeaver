/*
 * cloudbeaver - Cloud Database Manager
 * Copyright (C) 2020 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */

import { observer } from 'mobx-react';
import { useEffect, useCallback } from 'react';
import styled, { css } from 'reshadow';

import {
  TabsState, TabList, Tab, TabTitle, IconButton, Loader, StaticImage, Icon, BORDER_TAB_STYLES
} from '@cloudbeaver/core-blocks';
import { useController, useService } from '@cloudbeaver/core-di';
import { useTranslate } from '@cloudbeaver/core-localization';
import { useStyles, composes } from '@cloudbeaver/core-theming';

import { ConnectionForm } from '../ConnectionForm/ConnectionForm';
import { IConnectionFormModel } from '../ConnectionForm/IConnectionFormModel';
import { CreateConnectionService } from '../CreateConnectionService';
import { CreateConnectionController } from './CreateConnectionController';
import { CreateConnectionMethod } from './CreateConnectionMethod';
import { CustomConnection } from './CustomConnection';
import { SearchDatabase } from './SearchDatabase';

const styles = composes(
  css`
    title-bar {
      composes: theme-border-color-background from global;
    }

    Tab {
      composes: theme-ripple theme-background-secondary theme-text-on-secondary from global;
    }

    TabList {
      composes: theme-background-surface theme-text-on-surface from global;
    }

    connection-create-footer, connection-create-content {
      composes: theme-background-secondary theme-text-on-secondary from global;
    }
  `,
  css`
    connection-create {
      display: flex;
      flex-direction: column;
      height: 556px;
      overflow: hidden;
    }

    connection-create-footer {
      padding-bottom: 48px;
      flex: auto 0 0;
    }

    connection-create-content {
      position: relative;
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: auto;
    }

    CustomConnection, SearchDatabase {
      height: 100%;
      overflow: auto;
    }

    Loader {
      z-index: 1;
    }

    title-bar {
      composes: theme-typography--headline6 from global;
      padding: 16px 24px;
      border-top: solid 1px;
      align-items: center;
      display: flex;
      font-weight: 400;
      flex: auto 0 0;
    }

    IconButton {
      color: rgba(0, 0, 0, 0.45);
    }

    StaticImage {
      width: 32px;
      max-height: 32px;
      margin-right: 16px;
    }

    fill {
      flex: 1;
    }

    back-button {
      position: relative;
      box-sizing: border-box;
      margin-right: 16px;
      display: flex;

      & Icon {
        box-sizing: border-box;
        transform: rotate(90deg);
        cursor: pointer;
        height: 16px;
        width: 16px;
      }
    }
  `
);

interface Props {
  method: string;
  configurationWizard: boolean;
  onChange: (method: string) => void;
  onCancel: () => void;
}

export const CreateConnection = observer(function CreateConnection({
  method,
  configurationWizard,
  onChange,
  onCancel,
}: Props) {
  const style = useStyles(styles);
  const service = useService(CreateConnectionService);
  const controller = useController(CreateConnectionController);
  const translate = useTranslate();

  useEffect(() => {
    if (configurationWizard) {
      controller.search();
    }
  }, [configurationWizard, controller]);

  const handleConnectionCancel = useCallback(() => {
    if (method === 'driver') {
      onCancel();
    } else {
      controller.back();
    }
  }, [controller, method, onCancel]);

  if (controller.connection) {
    return styled(style)(
      <connection-create as='div'>
        <title-bar as='div'>
          <back-button as='div'><Icon name="angle" viewBox="0 0 15 8" onClick={controller.back} /></back-button>
          {controller.driver?.icon && <StaticImage icon={controller.driver.icon} />}
          {controller.driver?.name ?? translate('connections_administration_connection_create')}
          <fill as="div" />
          <IconButton name="cross" viewBox="0 0 24 24" onClick={onCancel} />
        </title-bar>
        <connection-create-content as='div'>
          <ConnectionForm
            model={controller as IConnectionFormModel}
            onBack={controller.back}
            onCancel={handleConnectionCancel}
          />
        </connection-create-content>
        <connection-create-footer as='div' />
      </connection-create>
    );
  }

  return styled(style, BORDER_TAB_STYLES)(
    <connection-create as='div'>
      <TabsState currentTabId={method} onChange={onChange}>
        <title-bar as='div'>
          {translate('connections_administration_connection_create')}
          <fill as="div" />
          <IconButton name="cross" viewBox="0 0 16 16" onClick={onCancel} />
        </title-bar>
        <TabList>
          <Tab tabId='driver'>
            <TabTitle>{translate('connections_connection_create_custom')}</TabTitle>
          </Tab>
          <Tab tabId='search-database'>
            <TabTitle>{translate('connections_connection_create_search_database')}</TabTitle>
          </Tab>
          {service.methodList.map(method => (
            <Tab key={method.key} tabId={method.key}>
              <TabTitle>{translate(method.title)}</TabTitle>
            </Tab>
          ))}
        </TabList>
      </TabsState>
      <connection-create-content as='div'>
        {method === 'driver' && <CustomConnection onSelect={controller.onDriverSelect} />}
        {method === 'search-database' && (
          <SearchDatabase
            databases={controller.databases}
            hosts={controller.hosts}
            disabled={controller.isProcessing}
            onSelect={controller.onDatabaseSelect}
            onSearch={controller.search}
            onChange={controller.onSearchChange}
          />
        )}
        <CreateConnectionMethod methodId={method} />
        {controller.isProcessing && <Loader overlay />}
      </connection-create-content>
      <connection-create-footer as='div' />
    </connection-create>
  );
});
