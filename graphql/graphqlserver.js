const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { typeDefs } = require("./schemas");
const cors = require("cors");
const express = require("express");
const isAuth = require("../middleware/auth");
const { resolvers } = require("./resolvers");

const setHttpPlugin = {
  async requestDidStart() {
    return {
      async willSendResponse({ response }) {
        const errorObject = response.body.singleResult.errors;
        let error;
        if (errorObject) {
          error = errorObject[0];
        }
        if (response.body.kind === "single" && error) {
          response.http.status =
            typeof error.extensions?.code === "number"
              ? error.extensions?.code
              : 500;
          response.body.singleResult.errors = [
            {
              message: error.message || "Internal Server Error",
              statusCode: response.http.status,
              path: error.path,
            },
          ];
        }
      },
    };
  },
};

const startGraphQLServer = async (app) => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [setHttpPlugin],
  });

  await server.start();

  app.use(
    "/graphql",
    isAuth,
    express.json(),
    cors({
      origin: "http://localhost:4200",
      methods: "GET,POST,PUT,DELETE",
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
      credentials: true,
    }),
    expressMiddleware(server, {
      context: ({ req, res }) => ({ req, res }),
    })
  );
};

module.exports = startGraphQLServer;
