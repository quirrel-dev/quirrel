import { FastifyPluginCallback, FastifyRequest } from "fastify";
import { ApolloServer } from "apollo-server-fastify";
import { makeSchema, queryType } from "nexus";

const Query = queryType({
  definition(t) {
    t.string("hello", { resolve: () => "hello world!" });
  },
});

const schema = makeSchema({
  types: [Query],
});

const server = new ApolloServer({
  schema,
  playground: true,
  introspection: true,
});

interface GraphqlOptions {
  passphrases: string[];
}

const graphqlRoute: FastifyPluginCallback<GraphqlOptions> = server.createHandler();

export default graphqlRoute;
