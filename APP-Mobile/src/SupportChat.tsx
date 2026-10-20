import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { MessageCircle, Send, ShieldCheck } from "lucide-react";
import { db, friendly } from "./firebase";
import { sendSupportMessage, type HelpRequest } from "./support";
import {
  isPreview,
  previewUid,
  readPreviewMessages,
  sendPreviewMessage,
} from "./preview";
type Message = {
  id: string;
  senderUid: string;
  text: string;
  createdAt?: Timestamp;
  pending?: boolean;
};
export default function SupportChat({
  request,
  uid,
  visible,
  onUnread,
}: {
  request: HelpRequest;
  uid: string;
  visible: boolean;
  onUnread: (count: number) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null),
    visibleRef = useRef(visible),
    unread = useRef(0),
    onUnreadRef = useRef(onUnread);
  visibleRef.current = visible;
  onUnreadRef.current = onUnread;
  useEffect(() => {
    if (visible) {
      unread.current = 0;
      onUnreadRef.current(0);
      end.current?.scrollIntoView({ block: "nearest" });
    }
  }, [visible, messages]);
  useEffect(() => {
    setMessages([]);
    setError("");
    let initialized = false;
    const known = new Set<string>();
    const receive = (next: Message[]) => {
      if (initialized) {
        const added = next.filter(
          (m) => !known.has(m.id) && m.senderUid !== uid,
        );
        if (!visibleRef.current && added.length) {
          unread.current += added.length;
          onUnreadRef.current(unread.current);
        }
      }
      next.forEach((m) => known.add(m.id));
      initialized = true;
      setMessages(next);
    };
    if (isPreview) {
      const refresh = () => receive(readPreviewMessages(request.chatId));
      refresh();
      window.addEventListener("aumm:preview-chat", refresh);
      return () => window.removeEventListener("aumm:preview-chat", refresh);
    }
    if (!db) return;
    return onSnapshot(
      query(
        collection(
          db,
          "supportRequests",
          request.id,
          "chats",
          request.chatId,
          "messages",
        ),
        orderBy("createdAt", "desc"),
        limit(100),
      ),
      (snapshot) =>
        receive(
          snapshot.docs
            .map(
              (d) =>
                ({
                  id: d.id,
                  ...d.data(),
                  pending: d.metadata.hasPendingWrites,
                }) as Message,
            )
            .reverse(),
        ),
      (e) => setError(friendly(e)),
    );
  }, [request.id, request.chatId, uid]);
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      if (isPreview) sendPreviewMessage(request, text.trim());
      else await sendSupportMessage(request, text);
      setText("");
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }
  const currentUid = isPreview ? previewUid : uid;
  return (
    <section className="support-chat" aria-label="Chat do atendimento">
      <div className="chat-intro">
        <MessageCircle size={21} />
        <div>
          <strong>Conversem por aqui</strong>
          <p>
            <ShieldCheck size={12} /> Privado para os dois participantes.
          </p>
        </div>
      </div>
      <div
        className="chat-messages"
        role="log"
        aria-live="polite"
        aria-label="Mensagens do apoio"
      >
        {!messages.length && (
          <div className="chat-empty">
            <MessageCircle size={30} />
            <strong>Combine o encontro</strong>
            <p>
              Conte onde está e confirme um ponto de referência. Evite enviar
              documentos ou senhas.
            </p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message ${message.senderUid === currentUid ? "mine" : "theirs"}`}
          >
            <span>
              {message.senderUid === currentUid ? "Você" : "Outro participante"}
            </span>
            <p>{message.text}</p>
            <small>
              {message.pending
                ? "Enviando…"
                : message.createdAt
                    ?.toDate()
                    .toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }) || "Agora"}
            </small>
          </div>
        ))}
        <div ref={end} />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <form className="chat-composer" onSubmit={(event) => void send(event)}>
        <label className="sr-only" htmlFor="support-chat-text">
          Mensagem
        </label>
        <textarea
          id="support-chat-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="Escreva sua mensagem…"
          required
        />
        <button
          className="btn"
          disabled={busy || !text.trim()}
          aria-label="Enviar mensagem"
        >
          {busy ? "…" : <Send size={19} />}
        </button>
      </form>
      <small className="form-note">
        Chat disponível durante o atendimento. Ao encerrar, o acesso às
        mensagens termina.
        {isPreview && " Respostas desta prévia são simuladas."}
      </small>
    </section>
  );
}
