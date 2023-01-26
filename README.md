# apollo-server-plugin-conditional-introspection

[![GitHub Release](https://github.com/AaronMoat/apollo-server-plugin-conditional-introspection/workflows/Release/badge.svg?branch=main)](https://github.com/AaronMoat/apollo-server-plugin-conditional-introspection/actions?query=workflow%3ARelease)
[![GitHub Validate](https://github.com/AaronMoat/apollo-server-plugin-conditional-introspection/workflows/Validate/badge.svg?branch=main)](https://github.com/AaronMoat/apollo-server-plugin-conditional-introspection/actions?query=workflow%3AValidate)
[![npm package](https://img.shields.io/npm/v/apollo-server-plugin-conditional-introspection)](https://www.npmjs.com/package/apollo-server-plugin-conditional-introspection)

This plugin allows you to conditionally enable or disable introspection queries in Apollo Server. This can be turned on and off only globally, by default - the plugin allows you to enable or disable introspection queries based on the incoming request.

The use case would be e.g. requiring authentication, an API key, an IP address, or whatever else, allowing you to have introspection in production without enabling it for everyone.

Why disable it at all? https://www.apollographql.com/blog/graphql/security/why-you-should-disable-graphql-introspection-in-production/

Inspired by conversations in https://github.com/apollographql/apollo-server/issues/1933 and https://github.com/graphql/graphql-js/issues/113, which got close but didn't do exactly what I wanted.

## Usage

Make sure you have the plugin installed:

```bash
npm install apollo-server-plugin-conditional-introspection
```

You also need graphql (>= 16.6) and apollo server (4) installed:

```bash
npm install graphql apollo-server
```

Then, in your Apollo Server config, add the plugin:

```ts
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginConditionalIntrospection } from 'apollo-server-plugin-conditional-introspection';

...

const server = new ApolloServer<YourContextType>({
  ...,
  introspection: true,
  plugins: [
    ...,
    createConditionalIntrospectionPlugin<YourContextType>({
      allowIntrospectionForRequest: (requestContext: GraphQLRequestContextResponseForOperation<YourContextType>) => {
        // You can use the request to decide whether to allow introspection
        // For example, you could require an API key, or authentication, or an IP address
        return true;
      },
    })
  ]
});
```

## Options

The plugin takes an options object with the following properties:

- `allowIntrospectionForRequest`: A function that returns a boolean indicating whether introspection is allowed, for a given request, receiving in the request context. If this function returns `true`, introspection is allowed. If it returns `false`, introspection is not allowed.
- `introspectionDisabledStatusCode`: What status code to return when introspection is not allowed, defaulting to allowing apollo to decide (usually 200)
- `introspectionDisabledHeaders`: What headers to return when introspection is not allowed, defaulting to no headers
- `introspectionDisabledError`: A GraphQLError to return when introspection is not allowed - defaults to message = "Introspection is not allowed" and code = "INTROSPECTION_NOT_ALLOWED".

## Development

### Prerequisites

- Node.js LTS
- Yarn 1.x

```shell
yarn install
```

### Test

```shell
yarn test
```

### Lint

```shell
# Fix issues
yarn format

# Check for issues
yarn lint
```

### Package

```shell
# Compile source
yarn build

# Review bundle
npm pack
```
