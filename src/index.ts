import {
  ApolloServerPlugin,
  BaseContext,
  GraphQLRequestContextResponseForOperation,
  HeaderMap,
} from '@apollo/server';
import {
  GraphQLError,
  NoSchemaIntrospectionCustomRule,
  validate,
} from 'graphql';

export type ApolloServerConditionalIntrospectionPluginOptions<
  TContext extends BaseContext,
> = {
  /**
   * A function that returns a boolean indicating whether introspection is allowed, for a given request, receiving in
   * the request context.
   **/
  allowIntrospectionForRequest: (
    requestContext: GraphQLRequestContextResponseForOperation<TContext>,
  ) => boolean;
  /**
   * What status code to return when introspection is not allowed, defaulting to 200
   **/
  introspectionDisabledStatusCode?: number;
  /**
   * What headers to return when introspection is not allowed, defaulting to no headers
   */
  introspectionDisabledHeaders?: Record<string, string>;
  /**
   * What GraphQLError to return - defaulting to message = "Introspection is not allowed" and code = "INTROSPECTION_NOT_ALLOWED"
   */
  introspectionDisabledError?: GraphQLError;
};

export const DEFAULT_INTROSPECTION_DISABLED_ERROR_MESSAGE =
  'Introspection is not allowed';

export const DEFAULT_INTROSPECTION_DISABLED_ERROR_CODE =
  'INTROSPECTION_NOT_ALLOWED';

/* eslint-disable @typescript-eslint/require-await */

export const createConditionalIntrospectionPlugin = <
  TContext extends BaseContext,
>({
  allowIntrospectionForRequest,
  introspectionDisabledStatusCode,
  introspectionDisabledHeaders,
  introspectionDisabledError,
}: ApolloServerConditionalIntrospectionPluginOptions<TContext>): ApolloServerPlugin<TContext> => ({
  requestDidStart: async () => ({
    responseForOperation: async (
      requestContext: GraphQLRequestContextResponseForOperation<TContext>,
    ) => {
      if (allowIntrospectionForRequest(requestContext)) {
        return null;
      }

      const { schema, document } = requestContext;

      const errors = validate(
        schema,
        document,
        [NoSchemaIntrospectionCustomRule],
        { maxErrors: 1 },
      );

      if (errors.length === 0) {
        return null;
      }

      const headers = new HeaderMap();
      Object.entries(introspectionDisabledHeaders ?? {}).forEach(
        ([key, value]) => {
          headers.set(key, value);
        },
      );

      return {
        http: {
          status: introspectionDisabledStatusCode ?? 200,
          headers,
        },
        body: {
          kind: 'single',
          singleResult: {
            data: null,
            errors: [
              introspectionDisabledError ??
                new GraphQLError(DEFAULT_INTROSPECTION_DISABLED_ERROR_MESSAGE, {
                  extensions: {
                    code: DEFAULT_INTROSPECTION_DISABLED_ERROR_CODE,
                  },
                }),
            ],
          },
        },
      };
    },
  }),
});

/* eslint-enable @typescript-eslint/require-await */
