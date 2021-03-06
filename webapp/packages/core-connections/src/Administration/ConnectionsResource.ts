/*
 * cloudbeaver - Cloud Database Manager
 * Copyright (C) 2020 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */

import { Observable, Subject } from 'rxjs';

import { injectable } from '@cloudbeaver/core-di';
import {
  GraphQLService,
  AdminConnectionFragment,
  ConnectionConfig,
  CachedMapResource,
  ResourceKey,
  isResourceKeyList,
  AdminConnectionGrantInfo,
  AdminConnectionSearchInfo
} from '@cloudbeaver/core-sdk';
import { MetadataMap } from '@cloudbeaver/core-utils';

export const NEW_CONNECTION_SYMBOL = Symbol('new-connection');

export type AdminConnection = AdminConnectionFragment;
export type ConnectionNew = AdminConnectionFragment & { [NEW_CONNECTION_SYMBOL]: boolean };

@injectable()
export class ConnectionsResource extends CachedMapResource<string, AdminConnection> {
  readonly onConnectionCreate: Observable<AdminConnection>;

  private changed: boolean;
  private metadata: MetadataMap<string, boolean>;
  private connectionCreateSubject: Subject<AdminConnection>;

  constructor(
    private graphQLService: GraphQLService
  ) {
    super(new Map());
    this.changed = false;
    this.connectionCreateSubject = new Subject<AdminConnection>();
    this.onConnectionCreate = this.connectionCreateSubject.asObservable();
    this.metadata = new MetadataMap(() => false);
  }

  has(id: string): boolean {
    if (this.metadata.has(id)) {
      return this.metadata.get(id);
    }

    return this.data.has(id);
  }

  isNew(id: string): boolean {
    const connection = this.get(id);
    if (!connection) {
      return false;
    }
    return (connection as ConnectionNew)[NEW_CONNECTION_SYMBOL];
  }

  async loadAll(): Promise<Map<string, AdminConnection>> {
    await this.load('all');
    return this.data;
  }

  async searchDatabases(hosts: string[]): Promise<AdminConnectionSearchInfo[]> {
    const { databases } = await this.graphQLService.sdk.searchDatabases({ hosts });

    return databases;
  }

  async create(config: ConnectionConfig): Promise<AdminConnection> {
    const { connection } = await this.graphQLService.sdk.createConnectionConfiguration({ config });

    return this.add(connection, true);
  }

  async add(connection: AdminConnection, isNew = false): Promise<AdminConnection> {
    this.changed = true;
    const newConnection: ConnectionNew = {
      ...connection,
      [NEW_CONNECTION_SYMBOL]: isNew,
    };
    this.set(newConnection.id, newConnection);

    const observedConnection = this.get(connection.id)!;
    this.connectionCreateSubject.next(observedConnection);
    return observedConnection;
  }

  async test(config: ConnectionConfig): Promise<void> {
    await this.graphQLService.sdk.testConnection({
      config,
    });
  }

  async update(id: string, config: ConnectionConfig): Promise<AdminConnection> {
    await this.performUpdate(id, () => this.updateConnection(id, config));
    this.changed = true;
    return this.get(id)!;
  }

  async delete(key: ResourceKey<string>): Promise<void> {
    await this.performUpdate(key, () => this.deleteConnectionTask(key));
    this.changed = true;
  }

  async updateSessionConnections(): Promise<boolean> {
    if (!this.changed) {
      return false;
    }

    await this.graphQLService.sdk.refreshSessionConnections();
    this.changed = false;
    return true;
  }

  async loadAccessSubjects(connectionId: string): Promise<AdminConnectionGrantInfo[]> {
    const { subjects } = await this.graphQLService.sdk.getConnectionAccess({ connectionId });

    return subjects;
  }

  async setAccessSubjects(connectionId: string, subjects: string[]): Promise<void> {
    await this.graphQLService.sdk.setConnectionAccess({ connectionId, subjects });
  }

  protected async loader(key: ResourceKey<string>): Promise<Map<string, AdminConnection>> {
    const { connections } = await this.graphQLService.sdk.getConnections();
    this.data.clear();

    for (const connection of connections) {
      this.set(connection.id, connection);
    }
    this.markUpdated(key);

    // TODO: getConnections must accept connectionId, so we can update some connection or all connections,
    //       here we should check is it's was a full update
    this.metadata.set('all', true);

    return this.data;
  }

  private async deleteConnectionTask(key: ResourceKey<string>) {
    if (isResourceKeyList(key)) {
      for (let i = 0; i < key.list.length; i++) {
        await this.deleteConnection(key.list[i]);
      }
    } else {
      await this.deleteConnection(key);
    }
    this.itemDeleteSubject.next(key);
  }

  private async deleteConnection(connectionId: string) {
    if (!this.data.has(connectionId)) {
      return;
    }

    await this.graphQLService.sdk.deleteConnectionConfiguration({ id: connectionId });
    this.data.delete(connectionId);
  }

  private async updateConnection(id: string, config: ConnectionConfig) {
    const { connection } = await this.graphQLService.sdk.updateConnectionConfiguration({ id, config });

    this.set(id, connection);
  }
}
