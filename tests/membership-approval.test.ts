import assert from "node:assert/strict";
import test from "node:test";
import { approvedMemberDetails } from "../lib/membershipApproval.ts";

test("approval preserves the submitted birth date and WhatsApp in the member profile", () => {
  const birthDate = { seconds: 633787200, nanoseconds: 0 };
  const profile = approvedMemberDetails({ fullName: " Pessoa de teste ", birthDate, whatsapp: "(47) 99999-1111", category: "Ciclista" });
  assert.equal(profile.birthDate, birthDate);
  assert.equal(profile.fullName, "Pessoa de teste");
  assert.equal(profile.phone, "(47) 99999-1111");
  assert.equal(profile.whatsapp, profile.phone);
  assert.equal(profile.category, "Ciclista");
});

test("legacy requests keep missing dates empty instead of inventing a birth date", () => {
  const profile = approvedMemberDetails({ fullName: "Pessoa antiga" });
  assert(!("birthDate" in profile));
  assert(!("createdAt" in profile));
  assert(!Object.values(profile).includes(undefined));
});
