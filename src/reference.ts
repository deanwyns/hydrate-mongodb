import {InternalSession} from "./session";
import {EntityMapping} from "./mapping/entityMapping";
import {ResultCallback} from "./core/callback";
import {PersistenceError} from "./persistenceError";

/**
 * @hidden
 */
export class Reference {

    /**
     * The id of the reference as a string.
     */
    id: string;

    constructor(public mapping: EntityMapping, private _id: any) {

        if (_id != null) {
            this.id = _id.toString();
        }
    }

    fetch(session: InternalSession, callback: ResultCallback<any>): void {

        if (!this.mapping) {
            process.nextTick(() => callback(new PersistenceError("Object type is not mapped as an entity.")));
            return;
        }

        if (this._id == null) {
            process.nextTick(() => callback(new PersistenceError("Missing or invalid identifier.")));
            return;
        }

        session.getPersister(this.mapping).findOneById(this._id, callback);
    }

    /**
     * Returns true if other is another reference with the same id or the resolved entity for the reference.
     * @param other The reference or entity to compare.
     */
    equals(other: any): boolean {

        return Reference.areEqual(this, other);
    }

    /**
     * Returns true if values are equivalent. Either value can be a Reference or an Entity.
     * @param value1 The first reference or entity to compare.
     * @param value2 The second reference or entity to compare.
     */
    static areEqual(value1: any, value2: any): boolean {

        if(value1 == value2) return true;
        if(value1 == null || value2 == null) return false;

        if(Reference.isReference(value1)) {
            var mapping1 = (<Reference>value1).mapping;
            var id1 = (<Reference>value1)._id;
        }
        else {
            // if value is not a Reference, we assume it's an Entity
            var id1 = value1._id;
        }

        if(Reference.isReference(value2)) {
            var mapping2 = (<Reference>value2).mapping;
            var id2 = (<Reference>value2)._id;
        }
        else {
            // if value is not a Reference, we assume it's an Entity
            var id2 = value2._id;
        }

        // if neither value is a Reference, then return false
        if (mapping1 == null && mapping2 == null) return false;

        // if we are not able to find both identifiers, then return false
        if (id1 == null || id2 == null) return false;

        // No need to check that the mappings are equivalent since the identifiers are assumed to be globally
        // unique. The identity generator's 'areEqual' function should return false if identifier types are
        // not compatible.
        return (<EntityMapping>(mapping1 || mapping2).inheritanceRoot).identity.areEqual(id1, id2)
    }

    static isReference(obj: any): boolean {

        return obj instanceof Reference;
    }

    /**
     * Fetches the Reference if the object is a Reference; otherwise, returns the passed object in the callback.
     * @param session The current session.
     * @param obj The object to fetch.
     * @param callback Called with the fetched object.
     */
    static fetch(session: InternalSession, obj: any, callback: ResultCallback<any>): void {

        if(Reference.isReference(obj)) {
            (<Reference>obj).fetch(session, callback);
        }
        else {
            callback(null, obj);
        }
    }
}

