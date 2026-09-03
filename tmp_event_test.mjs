const endpoint = "https://api.diaspoplug.net/graphql";
const email = "stephenbedz@gmail.com";
const password = "Amblessed6060@@";

const baseHeaders = {
  "content-type": "application/json",
};

async function gql(query, variables = {}, token = null, extraHeaders = {}) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...baseHeaders,
      ...extraHeaders,
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
    message
    sessionToken
    accessToken
    error
    user { email }
  }
}
`;

const USER_EVENTS = `
query UserEvents {
  userEvents {
    attending { id title }
    saved { id title }
  }
}
`;

const LIST_EVENTS = `
query ListEvents($input: ListEventsInput) {
  listEvents(input: $input) {
    events {
      id
      title
      status
      isPaid
      canRegister
      endAt
    }
  }
}
`;

const SAVE_EVENT = `
mutation SaveEvent($eventId: ID!) {
  saveEvent(eventId: $eventId) {
    id
    savedAt
  }
}
`;

const REGISTER_EVENT = `
mutation RegisterForEvent($input: RegisterForEventInput!) {
  registerForEvent(input: $input) {
    registrationId
    paymentIntentClientSecret
    waitlistPosition
  }
}
`;

async function login(deviceId) {
  const response = await gql(
    LOGIN,
    {
      input: {
        email,
        password,
        deviceId,
        rememberMe: true,
      },
    },
    null,
    { "x-device-fingerprint": deviceId }
  );

  const loginData = response?.data?.login;
  if (!loginData?.success || loginData?.requiresTwoFactor) {
    return { ok: false, response };
  }

  return {
    ok: true,
    token: loginData.sessionToken || loginData.accessToken,
    email: loginData.user?.email,
  };
}

(async () => {
  const firstLogin = await login("copilot-cli-test-device");
  if (!firstLogin.ok) {
    console.log(JSON.stringify({ step: "login1_failed", detail: firstLogin.response }, null, 2));
    process.exit(1);
  }

  const token = firstLogin.token;
  const before = await gql(USER_EVENTS, {}, token);
  const beforeAttending = before?.data?.userEvents?.attending ?? [];
  const beforeSaved = before?.data?.userEvents?.saved ?? [];

  const events = await gql(LIST_EVENTS, { input: { limit: 50, offset: 0 } }, token);
  const now = Date.now();
  const candidate = (events?.data?.listEvents?.events ?? []).find(
    (e) => String(e.status).toLowerCase() === "published" && !e.isPaid && e.canRegister && new Date(e.endAt).getTime() > now
  );

  if (!candidate) {
    console.log(
      JSON.stringify(
        {
          step: "no_candidate",
          before: { attending: beforeAttending.length, saved: beforeSaved.length },
        },
        null,
        2
      )
    );
    process.exit(2);
  }

  const saveResult = await gql(SAVE_EVENT, { eventId: candidate.id }, token);
  const registerResult = await gql(REGISTER_EVENT, { input: { eventId: candidate.id, quantity: 1 } }, token);

  const after = await gql(USER_EVENTS, {}, token);
  const afterAttending = after?.data?.userEvents?.attending ?? [];
  const afterSaved = after?.data?.userEvents?.saved ?? [];

  const secondLogin = await login("copilot-cli-test-device-refresh");
  if (!secondLogin.ok) {
    console.log(JSON.stringify({ step: "login2_failed", detail: secondLogin.response }, null, 2));
    process.exit(3);
  }

  const refreshed = await gql(USER_EVENTS, {}, secondLogin.token);
  const refreshedAttending = refreshed?.data?.userEvents?.attending ?? [];
  const refreshedSaved = refreshed?.data?.userEvents?.saved ?? [];

  console.log(
    JSON.stringify(
      {
        testedEvent: { id: candidate.id, title: candidate.title },
        before: { attending: beforeAttending.length, saved: beforeSaved.length },
        registerResult: registerResult?.data?.registerForEvent ?? null,
        saveErrors: saveResult?.errors ?? null,
        registerErrors: registerResult?.errors ?? null,
        after: {
          attending: afterAttending.length,
          saved: afterSaved.length,
          containsAttending: afterAttending.some((e) => e.id === candidate.id),
          containsSaved: afterSaved.some((e) => e.id === candidate.id),
        },
        afterRefreshLogin: {
          attending: refreshedAttending.length,
          saved: refreshedSaved.length,
          containsAttending: refreshedAttending.some((e) => e.id === candidate.id),
          containsSaved: refreshedSaved.some((e) => e.id === candidate.id),
        },
      },
      null,
      2
    )
  );
})();
