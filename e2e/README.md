# e2e

Playwright specs. GraphQL is **mocked** (`support/fakeSession.ts` answers by operation name),
and a mock accepts any field, so a spec can pass against a query the real gateway rejects.

Always pair mocked specs with the live-schema check:

```
npm run validate:graphql          # every gql`` document in src/ vs https://api.diaspoplug.net/graphql
npm run validate:graphql -- --all # also list the OK ones
```

It sends no credentials and no variables; queries are validated as-is, mutations only if they
declare a required `$var!` (validation fails the request before anything executes), the rest
are listed as "not checked". Exit code 1 means a document names a field, argument or type the
gateway does not have. When you add or change a document, run it, and name fixtures after the
real field names it reports.
