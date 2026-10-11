# Chiusura del pilot e registro decisioni

Lo Sprint 12 consolida le evidenze raccolte durante il pilot in quattro oggetti operativi:

1. **Snapshot KPI**: fotografia datata di partecipazione, onboarding, questionari, supporto, checklist e utilizzo.
2. **Azioni di miglioramento**: backlog bilingue con categoria, priorità, impatto, sforzo, proprietario, scadenza e origine dell'evidenza.
3. **Decisioni**: approvazione, rifiuto, rinvio o richiesta di ulteriori dati, sempre accompagnata da una motivazione.
4. **Rapporto finale**: sintesi esecutiva bilingue, raccomandazione, risultati, rischi e stato bozza/finale.

## Indice di preparazione

Il punteggio combina onboarding, risposta ai questionari, valutazione media, risoluzione del supporto, checklist e uso attivo. Le azioni critiche aperte applicano una penalità. Il risultato produce una raccomandazione tecnica:

- `go`;
- `go_with_conditions`;
- `extend_pilot`;
- `stop`.

La raccomandazione automatica è un supporto alla decisione e non sostituisce la valutazione degli stakeholder.

## Esportazione

L'endpoint amministrativo `/api/admin/pilot-closure/export` genera un rapporto Markdown con KPI, conclusioni e backlog.
