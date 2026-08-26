type FirebaseLikeError = {
  code?: unknown;
  message?: unknown;
};

export function firebaseErrorMessage(reason: unknown, fallback = "Não foi possível concluir a operação.") {
  const error = reason as FirebaseLikeError | null;
  const code = typeof error?.code === "string" ? error.code.replace(/^firestore\//, "") : "";
  const message = typeof error?.message === "string" ? error.message : "";

  if (code === "permission-denied" || message.includes("Missing or insufficient permissions")) {
    return "O Firebase não autorizou esta conta. Saia e entre novamente; se continuar, confira o cadastro ativo correspondente (adminRoles no painel ou associados no portal).";
  }
  if (code === "unauthenticated") return "Sua sessão expirou. Saia e entre novamente para continuar.";
  if (code === "unavailable") return "O Firebase está temporariamente indisponível. Tente novamente em instantes.";
  return message || fallback;
}
