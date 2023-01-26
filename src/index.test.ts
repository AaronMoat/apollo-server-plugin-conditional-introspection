import { ApolloServer, BaseContext } from '@apollo/server';
import { GraphQLError } from 'graphql';
import gql from 'graphql-tag';

import {
  ApolloServerConditionalIntrospectionPluginOptions,
  createConditionalIntrospectionPlugin,
} from '.';

describe('conditional introspection plugin', () => {
  it('should disable introspection if the condition callback returns false', async () => {
    const { http, body } = await runQuery(
      { allowIntrospectionForRequest: () => false },
      'query { helloWorld __schema { queryType { name } } }',
    );

    expect(http.headers).toEqual({});

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

    expect(http.headers).toEqual({});

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

  it('should allow normal queries through if the condition callback returns false', async () => {
    const { http, body } = await runQuery(
      { allowIntrospectionForRequest: () => false },
      'query { helloWorld }',
    );

    expect(http.headers).toEqual({});

    expect(body).toEqual({
      data: { helloWorld: 'hello world!' },
    });
  });

  it('should allow introspection if the condition callback returns true', async () => {
    const { http, body } = await runQuery(
      { allowIntrospectionForRequest: () => true },
      'query { helloWorld __schema { queryType { name } } }',
    );

    expect(http.headers).toEqual({});

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

    expect(http.headers).toEqual({});

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
        Object.entries(http.headers).filter(([key]) => key !== '__identity'),
      ),
    },
    body: body.kind === 'single' ? body.singleResult : body.initialResult,
  };
}
