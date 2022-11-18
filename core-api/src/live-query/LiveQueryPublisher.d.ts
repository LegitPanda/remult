import { itemChange, LiveQueryPublisherInterface } from '../context';
import { Repository, FindOptions } from '../remult3';
interface StoredQuery {
    id: string;
    findOptionsJson: any;
    lastIds: any[];
    requestJson: any;
    entityKey: string;
}
export declare class LiveQueryStorage {
    queries: StoredQuery[];
    constructor();
    store(query: StoredQuery): void;
    remove(id: any): void;
    provideListeners(entityKey: string, handle: (args: {
        query: StoredQuery;
        setLastIds(ids: any[]): Promise<void>;
        noListeners: () => Promise<void>;
    }) => Promise<void>): Promise<void>;
}
export declare class LiveQueryPublisher implements LiveQueryPublisherInterface {
    dispatcher: ServerEventDispatcher;
    private storage;
    private performWithRequest;
    constructor(dispatcher: ServerEventDispatcher, storage: LiveQueryStorage, performWithRequest: (serializedRequest: any, entityKey: string, what: (repo: Repository<any>) => Promise<void>) => Promise<void>);
    stopLiveQuery(id: any): void;
    sendChannelMessage<messageType>(channel: string, message: messageType): void;
    defineLiveQueryChannel(serializeRequest: () => any, entityKey: string, findOptions: FindOptions<any>, ids: any[], userId: string, repo: Repository<any>): string;
    runPromise(p: Promise<any>): void;
    itemChanged(entityKey: string, changes: itemChange[]): void;
}
export interface ServerEventDispatcher {
    anyoneListensToChannel(channel: string): Promise<boolean>;
    sendChannelMessage<T>(channel: string, message: T): void;
}
export {};
