"use client";
import { FormEvent, useState } from "react";
import { jsonFetch } from "@/lib/client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const data=new FormData(event.currentTarget);
    const payload={name:String(data.get("name")??""),email:String(data.get("email")??""),password:String(data.get("password")??""),privacyAccepted:data.get("privacyAccepted")==="on",pilotParticipant:data.get("pilotParticipant")==="on"};
    try { await jsonFetch(`/api/auth/${mode}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}); window.location.href="/dashboard"; }
    catch(cause){setError(cause instanceof Error?cause.message:"Operazione non riuscita")} finally{setBusy(false)}
  }
  return <form className="auth-form" onSubmit={submit}>{mode==="register"&&<label>Nombre<input name="name" autoComplete="name" required minLength={2}/></label>}<label>Correo electrónico<input name="email" type="email" autoComplete="email" required/></label><label>Contraseña<input name="password" type="password" autoComplete={mode==="login"?"current-password":"new-password"} required minLength={mode==="login"?1:10}/></label>{mode==="register"&&<><label className="consent-check"><input name="privacyAccepted" type="checkbox" required/>Acepto el <a href="/privacy" target="_blank">aviso de privacidad</a> y las <a href="/terms" target="_blank">condiciones de la demo</a>.</label><label className="consent-check"><input name="pilotParticipant" type="checkbox"/>Quiero participar en el piloto y recibir solicitudes de valoración dentro de la app.</label></>}{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={busy}>{busy?"…":mode==="login"?"Iniciar sesión":"Crear cuenta"}</button></form>
}
