import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db, friendly } from "./firebase";
import { isPreview, isPreviewHelper, readPreviewRequest } from "./preview";
import {
  reconcileSupportRequest,
  type HelpRequest,
  type SupportHelperProfile,
} from "./support";
export function useSupportActivity(user: User | null, active: boolean) {
  const [own, setOwn] = useState<HelpRequest | null>(null);
  const [helping, setHelping] = useState<HelpRequest[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    setError("");
    setOwn(null);
    setHelping([]);
    if (isPreview) {
      const refresh = () => {
        const current = readPreviewRequest();
        setOwn(isPreviewHelper ? null : current);
        setHelping(
          isPreviewHelper &&
            current &&
            ["awaiting_confirmation", "accepted"].includes(current.status)
            ? [current]
            : [],
        );
      };
      refresh();
      window.addEventListener("aumm:preview-support", refresh);
      return () => window.removeEventListener("aumm:preview-support", refresh);
    }
    if (!db || !user) return;
    const stops = [
      onSnapshot(
        doc(db, "supportRequests", user.uid),
        { includeMetadataChanges: true },
        (s) => {
          if (s.metadata.hasPendingWrites) return;
          setOwn(
            s.exists() ? ({ id: s.id, ...s.data() } as HelpRequest) : null,
          );
        },
        (e) => setError(friendly(e)),
      ),
    ];
    if (active)
      stops.push(
        onSnapshot(
          query(
            collection(db, "supportRequests"),
            where("helperUid", "==", user.uid),
            where("status", "in", ["awaiting_confirmation", "accepted"]),
          ),
          (s) =>
            setHelping(
              s.docs.map((d) => ({ id: d.id, ...d.data() }) as HelpRequest),
            ),
          (e) => setError(friendly(e)),
        ),
      );
    return () => stops.forEach((stop) => stop());
  }, [user?.uid, active]);
  useEffect(() => {
    if (isPreview) return;
    const committed = (event: Event) => {
      const { id, after } = (
        event as CustomEvent<{ id: string; after: HelpRequest }>
      ).detail;
      if (after.ownerUid === user?.uid) setOwn({ ...after, id });
      if (
        after.helperUid === user?.uid &&
        ["awaiting_confirmation", "accepted"].includes(after.status)
      )
        setHelping((current) => [
          { ...after, id },
          ...current.filter((r) => r.id !== id),
        ]);
      if (["resolved", "cancelled"].includes(after.status))
        setHelping((current) => current.filter((r) => r.id !== id));
    };
    window.addEventListener("aumm:support-updated", committed);
    return () => window.removeEventListener("aumm:support-updated", committed);
  }, [user?.uid]);
  return { own, helping, error };
}
export function useHelperProfile(request: HelpRequest) {
  const [profile, setProfile] = useState<SupportHelperProfile | null>(null);
  useEffect(() => {
    setProfile(null);
    if (
      !["awaiting_confirmation", "accepted"].includes(request.status) ||
      request.expiresAt.toMillis() <= Date.now()
    )
      return;
    if (isPreview) {
      setProfile({
        uid: "preview-helper",
        fullName: "Rafael Oliveira",
        memberNumber: "042",
      });
      return;
    }
    if (!db) return;
    return onSnapshot(
      doc(db, "supportRequests", request.id, "private", "helperProfile"),
      (s) => setProfile(s.exists() ? (s.data() as SupportHelperProfile) : null),
      () => {
        setProfile(null);
        void reconcileSupportRequest(request).catch(() => {});
      },
    );
  }, [request.id, request.status, request.helperUid]);
  return profile;
}

export function useSupportRequest(id: string) {
  const [request, setRequest] = useState<HelpRequest | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    setRequest(null);
    setError("");
    setLoading(true);
    if (isPreview) {
      const refresh = () => {
        setRequest(readPreviewRequest());
        setLoading(false);
      };
      refresh();
      window.addEventListener("aumm:preview-support", refresh);
      return () => window.removeEventListener("aumm:preview-support", refresh);
    }
    if (!db || !id) {
      setLoading(false);
      return;
    }
    const stop = onSnapshot(
      doc(db, "supportRequests", id),
      { includeMetadataChanges: true },
      (s) => {
        if (s.metadata.hasPendingWrites) return;
        setRequest(
          s.exists() ? ({ id: s.id, ...s.data() } as HelpRequest) : null,
        );
        setLoading(false);
      },
      (e) => {
        setError(friendly(e));
        setLoading(false);
      },
    );
    const committed = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; after: HelpRequest }>)
        .detail;
      if (detail.id === id) {
        setRequest({ ...detail.after, id });
        setLoading(false);
      }
    };
    window.addEventListener("aumm:support-updated", committed);
    return () => {
      stop();
      window.removeEventListener("aumm:support-updated", committed);
    };
  }, [id]);
  return { request, loading, error };
}
