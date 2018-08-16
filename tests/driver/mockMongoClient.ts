import { EventEmitter } from "events";
import * as mongodb from "mongodb";
import { Db, MongoCallback, MongoClient, MongoClientCommonOption, MongoClientOptions } from "mongodb";
import { MockDb } from "./mockDb";

export class MockMongoClient extends EventEmitter implements mongodb.MongoClient {

    static connect(uri: string, callback: MongoCallback<MongoClient>): void;
    static connect(uri: string, options?: MongoClientOptions): Promise<MongoClient>;
    static connect(uri: string, options: MongoClientOptions, callback: MongoCallback<MongoClient>): void;
    static connect(callback?: any): any {
        throw new Error("Method not implemented.");
    }

    connect(): Promise<MongoClient>;
    connect(callback: MongoCallback<MongoClient>): void;
    connect(...args: any[]): any {
        throw new Error("Method not implemented.");
    }

    /** http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html#close */
    close(callback: MongoCallback<void>): void;
    close(force?: boolean): Promise<void>;
    close(force: boolean, callback: MongoCallback<void>): void;
    close(force?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    /** http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html#db */
    db(dbName?: string, options?: MongoClientCommonOption): Db;
    db(dbName: string, options?: mongodb.MongoClientCommonOption): Db {
        return new MockDb(dbName);
    }

    /** http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html#isConnected */
    isConnected(options?: MongoClientCommonOption): boolean {
        throw new Error("Method not implemented.");
    }

    /** http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html#logout */
    logout(callback: MongoCallback<any>): void;
    logout(options?: { dbName?: string }): Promise<any>;
    logout(options: { dbName?: string }, callback: MongoCallback<any>): void;
    logout(options?: any, callback?: any): any {
        throw new Error("Method not implemented.");
    }

    /** http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html#startSession */
    startSession(options?: any): any {
        throw new Error("Method not implemented.");
    }
}
