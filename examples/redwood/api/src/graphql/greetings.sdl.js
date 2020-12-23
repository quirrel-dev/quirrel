export const schema = gql`
  type Mutation {
    enqueueGreeting(name: String!): Boolean
  }
`