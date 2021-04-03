import { FastifyPluginCallback } from "fastify";
import { ApolloServer } from "apollo-server-fastify";
import { makeSchema, queryType, stringArg } from "nexus";

const graphqlRoute: FastifyPluginCallback = async (app) => {
  const Query = queryType({
    definition(t) {
      t.list.field("tokens", {
        type: "String",
        resolve() {
          if (app.authEnabled) {
            return app.tokens.getAll();
          } else {
            return ["anonymous"];
          }
        },
      });

      t.list.field("queues", {
        type: "String",
        args: {
          tokenId: stringArg(),
        },
        resolve(_root, { tokenId }) {
          return app.queues.get(tokenId);
        },
      });
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

  return await server.createHandler()(app);
};

export default graphqlRoute;
