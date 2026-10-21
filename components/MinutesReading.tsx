"use client";

export default function MinutesReading({ minutes }: { minutes: Record<string, unknown> }) {
  const agendas = Array.isArray(minutes.agendas) ? minutes.agendas as Record<string, unknown>[] : [];
  const results = Array.isArray(minutes.results) ? minutes.results : [];
  return <details className="minutes-reading"><summary>Visualizar ata completa</summary>
    <h4>{String(minutes.assemblyTitle || "Ata da assembleia")}</h4>
    <p>{String(minutes.orderOfDay || "")}</p>
    <p>Eleitores habilitados: {String(minutes.eligibleVoterCount ?? "—")}. Presenças registradas: {Array.isArray(minutes.presence) ? minutes.presence.length : "—"}.</p>
    {agendas.map((agenda, index) => <section key={index}><h4>{String(agenda.title || `Pauta ${index + 1}`)}</h4><p>{String(agenda.description || "")}</p></section>)}
    {results.length > 0 && <><h4>Resultados registrados</h4>{results.map((result, index) => <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }} key={index}>{JSON.stringify(result, null, 2)}</pre>)}</>}
    {typeof minutes.text === "string" && <p style={{ whiteSpace: "pre-wrap" }}>{minutes.text}</p>}
  </details>;
}
