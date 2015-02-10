import Map = require("../core/map");
import Mapping = require("./mapping");
import MappingBase = require("./mappingBase");
import MappingError = require("./mappingError");
import PropertyFlags = require("./propertyFlags");
import Property = require("./property");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");
import Reference = require("../reference");
import InternalSession = require("../internalSession");
import ResultCallback = require("../core/resultCallback");

class ObjectMapping extends MappingBase {

    properties: Property[] = [];
    private _propertiesByName: Map<Property> = {};
    private _propertiesByField: Map<Property> = {};

    constructor() {
        super(MappingFlags.Object | MappingFlags.Embeddable);
    }

    addProperty(property: Property): void {

        var name = property.name;
        if (Map.hasProperty(this._propertiesByName, name)) {
            throw new Error("There is already a mapped property with the name '" + name + "'.");
        }
        this._propertiesByName[name] = property;

        if (Map.hasProperty(this._propertiesByField, property.field)) {
            throw new Error("There is already a mapped property for field '" + property.field + "'.");
        }
        this._propertiesByField[property.field] = property;

        this.properties.push(property);
    }

    getProperty(name: string): Property {

        return Map.getProperty(this._propertiesByName, name);
    }

    getPropertyForField(field: string): Property {

        return Map.getProperty(this._propertiesByField, field);
    }

    getProperties(flags?: PropertyFlags): Property[] {

        if (!flags) {
            return this.properties;
        }

        // TODO: cache search results

        var ret: Property[] = [];
        var properties = this.properties;
        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];
            if ((property.flags & flags) !== 0) {
                ret.push(property)
            }
        }
        return ret;
    }

    read(session: InternalSession, value: any, path: string, errors: MappingError[]): any {

        return this.readObject(session, {}, value, path, errors, /*checkRemoved*/ false);
    }

    protected readObject(session: InternalSession, obj: any, value: any, path: string, errors: MappingError[], checkRemoved: boolean): any {

        if(value === null || value === undefined) {
            return null;
        }

        if(typeof value !== "object") {
            errors.push({message: "Expected value to be an object.", path: path, value: value});
            return;
        }

        var base = path ? path + "." : "",
            properties = this.properties;

        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];

            // skip fields that are not persisted
            if (property.flags & (PropertyFlags.Ignored | PropertyFlags.InverseSide)) {
                continue;
            }
            var fieldValue = property.getFieldValue(value),
                propertyValue: any = undefined;

            // skip undefined values
            if (fieldValue !== undefined) {
                // skip null values unless allowed
                if (fieldValue === null) {
                    if (property.flags & PropertyFlags.Nullable) {
                        propertyValue = null;
                    }
                }
                else {
                    propertyValue = property.mapping.read(session, fieldValue, base + property.name, errors);
                }
            }

            if(propertyValue !== undefined) {
                property.setPropertyValue(obj, propertyValue);
            }
            else {
                // If the flag to check for removed properties is set, delete the property if the object has a value
                // but the document does not.
                if(checkRemoved && property.getPropertyValue(obj) !== undefined) {
                    // Deleting a property from an object causes the object to become non-optimized in V8. So we
                    // will just set the property value to undefined instead of deleting it. The resulting object is
                    // not exactly the same as if we had called delete but it's not worth the performance hit to
                    // call delete.
                    property.setPropertyValue(obj, undefined);
                }
            }
        }

        return obj;
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {


        return this.writeObject({}, value, path, errors, visited);
    }

    protected writeObject(document: any, value: any, path: string, errors: MappingError[], visited: any[]): any {

        var base = path ? path + "." : "",
            properties = this.properties,
            fieldValue: any;

        if (visited.indexOf(value) !== -1) {
            errors.push({message: "Recursive reference of embedded object is not allowed.", path: path, value: value});
            return;
        }
        visited.push(value);

        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i],
                flags = property.flags;

            // skip fields that are not persisted
            if (flags & (PropertyFlags.Ignored | PropertyFlags.InverseSide)) {
                continue;
            }

            var propertyValue = property.getPropertyValue(value);
            if (propertyValue === undefined) {
                // skip undefined values
                continue;
            }
            if (propertyValue === null) {
                // skip null values unless allowed
                if (!(flags & PropertyFlags.Nullable)) {
                    continue;
                }
                fieldValue = null;
            }
            else {
                fieldValue = property.mapping.write(propertyValue, base + property.name, errors, visited);
            }
            property.setFieldValue(document, fieldValue);
        }

        visited.pop();

        return document;
    }

    areEqual(documentValue1: any, documentValue2: any): boolean {

        if (typeof documentValue1 !== "object" || typeof documentValue2 !== "object") {
            return false;
        }

        var properties = this.properties;
        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];

            // skip fields that are not persisted
            if (property.flags & (PropertyFlags.Ignored | PropertyFlags.InverseSide)) {
                continue;
            }

            // get the field values from the documents
            var fieldValue1 = property.getFieldValue(documentValue1);
            var fieldValue2 = property.getFieldValue(documentValue2);

            if (fieldValue1 !== fieldValue2 && !property.mapping.areEqual(fieldValue1, fieldValue2)) {
                return false;
            }
        }

        return true;
    }

    walk(value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {

        if (!value || typeof value !== "object") return;

        if(this.flags & MappingFlags.Embeddable) {
            if (embedded.indexOf(value) !== -1) return;
            embedded.push(value);
        }

        var properties = this.properties;
        for (var i = 0, l = properties.length; i < l; i++) {
            var property = properties[i];
            // if the property is not ignored and it has the specified flags, then walk the value of the property
            if (!(property.flags & PropertyFlags.Ignored) && ((property.flags & flags) || ((flags & PropertyFlags.All) == 0))) {
                property.mapping.walk(property.getPropertyValue(value), flags, entities, embedded, references);
            }
        }
    }

    resolve(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void {

        if(!value || typeof value !== "object" || depth == path.length) {
            return callback(null, value);
        }

        var property = this.getProperty(path[depth]);
        if (property === undefined) {
            return callback(new Error("Undefined property '" + path[depth] + "' in path '"+ path.join(".") + "'."));
        }

        // TODO: In mapping validation, throw error if object that holds inverse side of relationship is not an entity

        var propertyValue = property.getPropertyValue(value);
        if((property.flags & PropertyFlags.InverseSide) && propertyValue === undefined) {
            property.mapping.resolveInverse(session, parentEntity, property.inverseOf, path, depth + 1, handleCallback);
        } else {
            property.mapping.resolve(session, parentEntity, propertyValue, path, depth + 1, handleCallback);
        }

        function handleCallback(err: Error, result: any) {
            if(err) return callback(err);

            if(propertyValue !== result) {
                property.setPropertyValue(value, result);
            }

            callback(null, value);
        }
    }
}

export = ObjectMapping;