import { ApolloServer, BaseContext, HeaderMap } from '@apollo/server';
import { GraphQLError } from 'graphql';
import gql from 'graphql-tag';

import {
  ApolloServerConditionalIntrospectionPluginOptions,
  createConditionalIntrospectionPlugin,
} from '.';

describe('conditional introspection plugin', () => {
  const apolloDefaultHeaders = { 'cache-control': 'no-store' };
  it('should disable introspection if the condition callback returns false', async () => {
    const { http, body } = await runQuery(
      { allowIntrospectionForRequest: () => false },
      'query { helloWorld __schema { queryType { name } } }',
    );

    expect(http).toEqual({ status: undefined, headers: apolloDefaultHeaders });

    expect(body).toEqual({
      data: null,
      errors: [
        expect.objectContaining({
          extensions: { code: 'INTROSPECTION_NOT_ALLOWED' },
          message: 'Introspection is not allowed',
        }),
      ],
    });
  });

  it('allow customising the status code, headers and error', async () => {
    const { http, body } = await runQuery(
      {
        allowIntrospectionForRequest: () => false,
        introspectionDisabledStatusCode: 400,
        introspectionDisabledHeaders: { 'x-custom-header': 'custom' },
        introspectionDisabledError: new GraphQLError('Message', {
          extensions: { code: 'CODE' },
        }),
      },
      'query { helloWorld __schema { queryType { name } } }',
    );

    expect(http).toEqual({
      status: 400,
      headers: { ...apolloDefaultHeaders, 'x-custom-header': 'custom' },
    });

    expect(body).toEqual({
      data: null,
      errors: [
        expect.objectContaining({
          extensions: { code: 'CODE' },
          message: 'Message',
        }),
      ],
    });
  });

  it('allow allow passing a HeaderMap for headers', async () => {
    const { http } = await runQuery(
      {
        allowIntrospectionForRequest: () => false,
        introspectionDisabledHeaders: new HeaderMap([
          ['x-custom-header', 'custom'],
        ]),
      },
      'query { helloWorld __schema { queryType { name } } }',
    );

    expect(http).toEqual({
      status: undefined,
      headers: { ...apolloDefaultHeaders, 'x-custom-header': 'custom' },
    });
  });

  it('should allow normal queries through if the condition callback returns false', async () => {
    const { http, body } = await runQuery(
      { allowIntrospectionForRequest: () => false },
      'query { helloWorld }',
    );

    expect(http).toEqual({ status: undefined, headers: apolloDefaultHeaders });

    expect(body).toEqual({
      data: { helloWorld: 'hello world!' },
    });
  });

  it('should allow introspection if the condition callback returns true', async () => {
    const { http, body } = await runQuery(
      { allowIntrospectionForRequest: () => true },
      'query { helloWorld __schema { queryType { name } } }',
    );

    expect(http).toEqual({ status: undefined, headers: apolloDefaultHeaders });

    expect(body).toEqual({
      data: {
        helloWorld: 'hello world!',
        __schema: {
          queryType: {
            name: 'Query',
          },
        },
      },
    });
  });

  it('should allow normal queries through if the condition callback returns true', async () => {
    const { http, body } = await runQuery(
      { allowIntrospectionForRequest: () => true },
      'query { helloWorld }',
    );

    expect(http).toEqual({ status: undefined, headers: apolloDefaultHeaders });

    expect(body).toEqual({
      data: { helloWorld: 'hello world!' },
    });
  });
});

async function runQuery(
  opts: ApolloServerConditionalIntrospectionPluginOptions<BaseContext>,
  query: string,
) {
  const server = new ApolloServer<BaseContext>({
    plugins: [createConditionalIntrospectionPlugin(opts)],
    typeDefs: gql`
      type Query {
        helloWorld: String
      }
    `,
    resolvers: {
      Query: {
        helloWorld: () => 'hello world!',
      },
    },
  });

  await server.start();

  const { http, body } = await server.executeOperation.bind(server)({
    query,
  });
  return {
    http: {
      ...http,
      headers: Object.fromEntries(
        [...http.headers.entries()].filter(([key]) => key !== '__identity'),
      ),
    },
    body: body.kind === 'single' ? body.singleResult : body.initialResult,
  };
}
