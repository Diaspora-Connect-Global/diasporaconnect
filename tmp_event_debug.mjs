const endpoint = "https://api.diaspoplug.net/graphql";
const email = "stephenbedz@gmail.com";
const password = "Amblessed6060@@";
const eventId = "257f5bb3-790f-4f14-88dc-c172255acb9c";

async function gql(query, variables = {}, token = null, fingerprint = null) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(fingerprint ? { "x-device-fingerprint": fingerprint } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

const LOGIN = `
mutation Login($input: LoginInput!) {
  login(input: $input) {
    success
    requiresTwoFactor
    sessionToken
    accessToken
    user { email }
  }
}
`;

const USER_EVENTS = `
query UserEvents {
  userEvents {
    attending { id title status isRegistered canRegister }
    saved { id title status isRegistered canRegister }
  }
}
`;

const LIST_EVENTS = `
query ListEvents($input: ListEventsInput) {
  listEvents(input: $input) {
    events { id title isRegistered canRegister status }
  }
}
`;

const IS_SAVED = `
query IsEventSaved($eventId: ID!) {
  isEventSaved(eventId: $eventId)
}
`;

const SAVE = `
mutation SaveEvent($eventId: ID!) {
  saveEvent(eventId: $eventId) { id savedAt }
}
`;

(async () => {
  const l = await gql(
    LOGIN,
    { input: { email, password, deviceId: "copilot-debug-device", rememberMe: true } },
    null,
    "copilot-debug-device"
  );
  const token = l?.data?.login?.sessionToken || l?.data?.login?.accessToken;

  const list = await gql(LIST_EVENTS, { input: { limit: 20, offset: 0 } }, token);
  const eventInList = (list?.data?.listEvents?.events ?? []).find((e) => e.id === eventId);

  const beforeSaved = await gql(IS_SAVED, { eventId }, token);
  const beforeEvents = await gql(USER_EVENTS, {}, token);
  const saveResult = await gql(SAVE, { eventId }, token);
  const afterSaved = await gql(IS_SAVED, { eventId }, token);
  const afterEvents = await gql(USER_EVENTS, {}, token);

  console.log(
    JSON.stringify(
      {
        login: {
          success: l?.data?.login?.success,
          requiresTwoFactor: l?.data?.login?.requiresTwoFactor,
          email: l?.data?.login?.user?.email,
          tokenPresent: Boolean(token),
        },
        eventInList,
        beforeSaved,
        saveResult,
        afterSaved,
        beforeEvents,
        afterEvents,
      },
      null,
      2
    )
  );
})();
