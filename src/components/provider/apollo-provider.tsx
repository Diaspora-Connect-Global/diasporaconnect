"use client"
import gqlClient from "@/lib/graph-client"

import { ApolloProvider } from "@apollo/client/react"

import { ReactNode } from "react"
export default function GraphQLProvider({ children }: { children: ReactNode }) {
    return (
        <ApolloProvider client={gqlClient}>
            {children}
        </ApolloProvider>
    )
}
