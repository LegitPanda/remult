import { v4 as uuid } from 'uuid';
import { itemChange, LiveQueryPublisherInterface } from '../context';
import { findOptionsFromJson, findOptionsToJson } from '../data-providers/rest-data-provider';
import { Repository, FindOptions } from '../remult3';

import { liveQueryMessage } from './LiveQuerySubscriber';



interface StoredQuery {
  id: string,
  findOptionsJson: any,
  lastIds: any[],
  requestJson: any,
  entityKey: string
}



export class LiveQueryStorage {
  queries: StoredQuery[] = [];

  constructor() {

  }
  store(query: StoredQuery) {
    this.queries.push(query);
  }
  remove(id: any) {
    this.queries = this.queries.filter(q => q.id !== id);
  }
  async provideListeners(entityKey: string, handle: (args: {
    query: StoredQuery,
    setLastIds(ids: any[]): Promise<void>,
    noListeners: () => Promise<void>
  }) => Promise<void>) {
    for (const q of this.queries) {
      if (q.entityKey === entityKey) {
        await handle({
          query: q,
          setLastIds: async ids => { q.lastIds = ids },
          noListeners: async () => { }
        })
      }
    }

  }
}


export class LiveQueryPublisher implements LiveQueryPublisherInterface {

  constructor(public dispatcher: ServerEventDispatcher, private storage: LiveQueryStorage, private performWithRequest: (serializedRequest: any, entityKey: string, what: (repo: Repository<any>) => Promise<void>) => Promise<void>) { }
  stopLiveQuery(id: any): void {
    this.storage.remove(id);
  }
  sendChannelMessage<messageType>(channel: string, message: messageType) {
    this.dispatcher.sendChannelMessage(channel, message);
  }

  defineLiveQueryChannel(serializeRequest: () => any, entityKey: string, findOptions: FindOptions<any>, ids: any[], userId: string, repo: Repository<any>): string {
    const id = `users:${userId}:queries:${uuid()}`;
    this.storage.store(
      {
        requestJson: serializeRequest(),
        entityKey,
        id,
        findOptionsJson: findOptionsToJson(findOptions, repo.metadata),
        lastIds: ids
      }
    );
    return id;
  }




  runPromise(p: Promise<any>) {

  }

  itemChanged(entityKey: string, changes: itemChange[]) {

    const messages = [];
    this.runPromise(this.storage.provideListeners(entityKey,
      async ({ query, setLastIds, noListeners }) => {
        if (await this.dispatcher.anyoneListensToChannel(query.id)) {

          await this.performWithRequest(query.requestJson, entityKey, async repo => {
            const currentItems = await repo.find(findOptionsFromJson(query.findOptionsJson, repo.metadata));
            const currentIds = currentItems.map(x => repo.getEntityRef(x).getId());
            for (const id of query.lastIds.filter(y => !currentIds.includes(y))) {
              let c = changes.find(c => c.oldId == id)
              if (c === undefined || id != c.oldId || !currentIds.includes(c.id))
                messages.push({
                  type: "remove",
                  data: {
                    id: id
                  }
                })
            }
            for (const item of currentItems) {
              const itemRef = repo.getEntityRef(item);
              let c = changes.find(c => c.id == itemRef.getId())
              if (c !== undefined && query.lastIds.includes(c.oldId)) {
                messages.push({
                  type: "replace",
                  data: {
                    oldId: c.oldId,
                    item: itemRef.toApiJson()
                  }
                });
              }
              else if (!query.lastIds.includes(itemRef.getId())) {
                messages.push({
                  type: "add",
                  data: { item: itemRef.toApiJson() }
                });
              }
            }
            await setLastIds(currentIds);
            this.dispatcher.sendChannelMessage(query.id, messages);
          })
        } else
          await noListeners();
      }));
  }
}



export interface ServerEventDispatcher {
  anyoneListensToChannel(channel: string): Promise<boolean>;
  sendChannelMessage<T>(channel: string, message: T): void;
}
// TODO - PUBNUB
// TODO - connect stream when server is not yet up - for angular proxy