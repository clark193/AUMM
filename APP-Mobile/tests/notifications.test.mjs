import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultNoticePreferences as prefs,
  normalizeCity,
  publicationNotice,
  supportNotices,
  shouldReceive,
  pushData,
  noticeChannel,
} from "../shared/notifications.ts";
const createdAt = 1800000000000;
const request = {
  status: "open",
  createdAt,
  expiresAt: createdAt + 86400000,
  city: "Blumenau",
  ownerUid: "owner",
  helperUid: "",
};
test("as transições do apoio têm mensagens distintas e não repetem em alterações sem transição", () => {
  const open = supportNotices("owner", null, request, createdAt);
  assert.deepEqual(
    open.map((n) => n.kind),
    ["support_sent", "support_nearby"],
  );
  assert.deepEqual(
    supportNotices(
      "owner",
      request,
      { ...request, city: "Gaspar" },
      createdAt + 1000,
    ),
    [],
  );
  const accepted = {
    ...request,
    status: "awaiting_confirmation",
    helperUid: "helper",
  };
  const [event] = supportNotices("owner", request, accepted, createdAt + 2000);
  assert.equal(event.kind, "support_accepted");
  assert.equal(
    supportNotices(
      "owner",
      accepted,
      { ...accepted, status: "resolved" },
      createdAt + 3000,
    )[0].kind,
    "support_resolved",
  );
  assert.equal(
    supportNotices(
      "owner",
      accepted,
      { ...accepted, status: "cancelled" },
      createdAt + 3000,
    )[0].kind,
    "support_cancelled",
  );
  assert.deepEqual(
    supportNotices("owner", accepted, accepted, createdAt + 3000),
    [],
  );
  assert.notEqual(
    open[0].id,
    supportNotices(
      "owner",
      { ...request, status: "resolved" },
      { ...request, createdAt: createdAt + 10 },
      createdAt + 10,
    )[0].id,
  );
});
test("somente o solicitante recebe aceite e somente associados da cidade recebem chamados", () => {
  const events = supportNotices("owner", null, request, createdAt);
  const nearby = events.find((e) => e.kind === "support_nearby");
  assert.equal(shouldReceive(nearby, "member", true, prefs), true);
  assert.equal(shouldReceive(nearby, "member", false, prefs), false);
  assert.equal(shouldReceive(nearby, "owner", true, prefs), false);
  assert.equal(
    shouldReceive(nearby, "member", true, { ...prefs, cityKey: "gaspar" }),
    false,
  );
  assert.equal(
    shouldReceive(nearby, "member", true, { ...prefs, nearbyHelp: false }),
    false,
  );
  const [accepted] = supportNotices(
    "owner",
    request,
    { ...request, status: "awaiting_confirmation", helperUid: "helper" },
    createdAt,
  );
  assert.equal(shouldReceive(accepted, "owner", false, prefs), true);
  assert.equal(shouldReceive(accepted, "helper", true, prefs), false);
  assert.equal(shouldReceive(accepted, "stranger", true, prefs), false);
});
test("conclusão avisa os dois participantes e respeita a preferência de atendimento", () => {
  const accepted = {
    ...request,
    status: "awaiting_confirmation",
    helperUid: "helper",
  };
  const [event] = supportNotices(
    "owner",
    accepted,
    { ...accepted, status: "resolved" },
    createdAt,
  );
  assert.equal(shouldReceive(event, "owner", false, prefs), true);
  assert.equal(shouldReceive(event, "helper", true, prefs), true);
  assert.equal(shouldReceive(event, "stranger", true, prefs), false);
  assert.equal(
    shouldReceive(event, "owner", false, { ...prefs, requestUpdates: false }),
    false,
  );
});
test("publicações respeitam estado, público e categorias de preferência", () => {
  assert.equal(
    publicationNotice("news", "news1", { status: "draft", createdAt }),
    null,
  );
  assert.equal(
    publicationNotice("communication", "c1", {
      status: "published",
      audience: "admins",
      createdAt,
    }),
    null,
  );
  const event = publicationNotice("news", "news1", {
    status: "published",
    title: "Nova notícia",
    publishedAt: createdAt,
  });
  assert.equal(shouldReceive(event, "guest", false, prefs), true);
  assert.equal(
    shouldReceive(event, "guest", false, { ...prefs, news: false }),
    false,
  );
  const comm = publicationNotice("communication", "c1", {
    status: "published",
    audience: "members",
    createdAt,
  });
  assert.equal(shouldReceive(comm, "guest", false, prefs), false);
  assert.equal(shouldReceive(comm, "member", true, prefs), true);
  assert.equal(normalizeCity(" Timbó "), "timbo");
});
test("a mesma origem gera o mesmo identificador e o payload de push não contém dados privados", () => {
  const [first] = supportNotices(
    "owner",
    request,
    { ...request, status: "awaiting_confirmation", helperUid: "helper" },
    createdAt,
  );
  const [retry] = supportNotices(
    "owner",
    request,
    { ...request, status: "awaiting_confirmation", helperUid: "helper" },
    createdAt + 10,
  );
  assert.equal(first.id, retry.id);
  const payload = pushData(first);
  assert.deepEqual(
    Object.keys(payload).sort(),
    [
      "noticeId",
      "kind",
      "target",
      "itemId",
      "title",
      "body",
      "createdAt",
      "expiresAt",
    ].sort(),
  );
  assert.equal("ownerUid" in payload, false);
  assert.equal("lat" in payload, false);
  assert.equal("token" in payload, false);
  assert.equal(noticeChannel(first.kind), "aumm-support");
  assert.equal(noticeChannel("news"), "aumm-news");
});

test("confirmação do solicitante avisa os dois participantes", () => {
  const before = {
    ...request,
    status: "awaiting_confirmation",
    helperUid: "helper",
  };
  const [notice] = supportNotices(
    "owner",
    before,
    { ...before, status: "accepted" },
    createdAt + 5000,
  );
  assert.equal(notice.kind, "support_confirmed");
  assert.equal(shouldReceive(notice, "owner", false, prefs), true);
  assert.equal(shouldReceive(notice, "helper", true, prefs), true);
  assert.equal(shouldReceive(notice, "stranger", true, prefs), false);
});
