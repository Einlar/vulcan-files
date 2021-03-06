import SimpleSchema from "simpl-schema";
import merge from "lodash/merge";
import pickBy from "lodash/pickBy";
import once from "lodash/once";
import get from "lodash/get";
import isString from "lodash/isString";
import isFinite from "lodash/isFinite";

import { FILE } from "./graphql/types";
import defaultResolveId from "./defaultResolveId";

/**
 * Generates schema for a file field.
 *
 * Note that this function returns a valid document schema that contains the
 * required file fields. This allows for this function to be spread to another
 * schema (see example).
 *
 * @example Single file field
 *  const schema = {
 *    otherField: {},
 *    ...generateFieldSchemaBase({
 *      fieldName: 'fileId',
 *      fieldSchema: {
 *        label: 'My field label',
 *        // ...other Vulcan schema options
 *      },
 *      resolverName: 'file',
 *    },
 *  };
 * @param {Object} options Options
 * @param {String} options.fieldName
 *  Field name
 * @param {Object} options.fieldSchema
 *  Field schema that will be merged with the autogenerated schema
 * @param {*=} options.fieldType=String
 *  Field type. This defines how the file will be actually stored in the collection.
 *  Defaults to `String` to store the id of the document in the files collection
 * @param {String} options.resolverName
 *  Resolver name. Shortcut to `fieldSchema.resolveAs.fieldName`, will override it
 * @param {Boolean=} options.multiple=false Whether the field is multiple or not
 * @return {Object}
 * @function generateFieldSchemaBase
 */
const generateFieldSchemaBase = (options = {}) => {
  const {
    fieldName,
    fieldSchema = {},
    fieldType = fieldSchema.type || String,
    resolverName = get(fieldSchema, "resolveAs.fieldName"),
    multiple = false,
    resolveId = defaultResolveId,
  } = options;

  const FileOrType = SimpleSchema.oneOf(
    // accept generic object so SimpleSchema does not coerce the file object
    // to the specified `fieldType`
    { type: Object, blackbox: true },
    fieldType
  );

  const formInputFieldSchema = {
    control: "Upload",
    form: {
      previewFromValue: once(() => (value, index, props) => {
        if (isString(resolveId(value))) {
          const resolvedValuePath = [resolverName];
          if (isFinite(index)) {
            resolvedValuePath.push(index);
          }
          return get(props.document, resolvedValuePath);
        }
        return undefined;
      }),
    },
  };

  const graphqlFieldSchema = {
    type: multiple ? Array : FileOrType,
    resolveAs: {
      fieldName: resolverName,
      type: multiple ? `[${FILE}]` : FILE,
      addOriginalField: true,
    },
  };

  const enhancedFieldSchema = merge(
    formInputFieldSchema,
    fieldSchema,
    graphqlFieldSchema
  );
  const schema = {
    [fieldName]: enhancedFieldSchema,
  };
  if (multiple) schema[`${fieldName}.$`] = { type: FileOrType };
  return schema;
};

export default generateFieldSchemaBase;
