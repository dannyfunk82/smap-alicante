import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <main id="main-content" className="auth-page">
      <section className="auth-brand" aria-labelledby="brand-title">
        <div className="brand-mark" aria-hidden="true">S</div>
        <p className="eyebrow">SMAP</p>
        <h1 id="brand-title">Crea il tuo account web</h1>
        <p>La registrazione usa solo email e password.</p>
      </section>
      <section className="auth-card" aria-labelledby="register-title">
        <h2 id="register-title">Crear cuenta</h2>
        <AuthForm mode="register" />
        <p className="auth-switch">¿Ya tienes una cuenta? <Link href="/login">Iniciar sesión</Link></p>
      </section>
    </main>
  );
}
