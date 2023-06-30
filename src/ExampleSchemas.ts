import {
    buildSchema,
    GraphQLError,
    GraphQLSchema
} from 'graphql'
import {
    AggregateError
} from  '@dreamit/graphql-server'
import {GraphQLRequestInfo} from '@dreamit/graphql-server-base'
import { SimplePubSub } from './SimplePubSub'

// Contains example schemas and data that can be used across tests

export interface User {
    userId: string
    userName: string
}

export interface LogoutResult {
    result: string
}

export const initialSchemaWithOnlyDescription = new GraphQLSchema({description:'initial'})

export const userOne: User = {userId: '1', userName:'UserOne'}
export const userTwo: User = {userId: '2', userName:'UserTwo'}

const users: Array<User> = [userOne, userTwo]
const pubsub = new SimplePubSub<User>()

export const userQuery = 'query user($id201: String!){ user(id: $id201) { userId userName } }'
export const userVariables = '{"id201":"1"}'
export const usersQuery = 'query users{ users { userId userName } }'
export const usersQueryWithUnknownField = 'query users{ users { userId userName hobby } }'
export const returnErrorQuery = 'query returnError{ returnError { userId } }'
export const loginMutation =
    'mutation login{ login(userName:"magic_man", password:"123456") { jwt } }'
export const logoutMutation = 'mutation logout{ logout { result } }'
export const introspectionQuery = 'query introspection{ __schema { queryType { name } } }'

export const usersRequest: GraphQLRequestInfo = {
    query: usersQuery,
    operationName: 'users',
}

export const loginRequest: GraphQLRequestInfo = {
    query: loginMutation,
    operationName: 'login'
}
export const usersRequestWithoutOperationName: GraphQLRequestInfo = {
    query: usersRequest.query,
}
export const usersRequestWithoutVariables: GraphQLRequestInfo = {
    query: usersRequest.query,
    operationName: usersRequest.operationName
}

export const userSchema = buildSchema(`
  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
  
  type Query {
    returnError: User 
    users: [User]
    user(id: String!): User
  }
  
  type Mutation {
    createUser(userId: String, userName: String): User
    login(userName: String, password: String): LoginData
    logout: LogoutResult
  }

  type Subscription {
    userCreated: User
  }
  
  type User {
    userId: String
    userName: String
  }
  
  type LoginData {
    jwt: String
  }
  
  type LogoutResult {
    result: String
  }
`)

export const userSchemaResolvers= {
    createUser(input: { userId: string, userName: string }): User {        
        const newUser: User = { userId: input.userId, userName: input.userName}
        pubsub.emit(newUser)
        return newUser
    },
    returnError(): User {
        throw new GraphQLError('Something went wrong!', {})
    },
    users(): User[] {
        return users
    },
    user(input: { id: string }): User {        
        switch (input.id) {
        case '1': {
            return userOne
        }
        case '2': {
            return userTwo
        }
        default: {
            throw new GraphQLError(`User for userid=${input.id} was not found`, {})
        }
        }
    },
    logout(): LogoutResult {
        return {result: 'Goodbye!'}
    },
    userCreated(): AsyncGenerator<User, void, void> {
        return pubsub.getSubscriber((newUser) => {
            users.push(newUser)
            return newUser  
        })
    }
}

export const multipleErrorResponse = {
    errors: [new GraphQLError('The first error!, The second error!',
        {
            originalError:
                {
                    name: 'AggregateError',
                    message:'The first error!, The second error!',
                    errors: [
                        new GraphQLError('The first error!', {}),
                        new GraphQLError('The second error!', {})
                    ]
                } as AggregateError
        })]
}

