import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main id="main-content" className="auth-page">
      <section className="auth-brand" aria-labelledby="brand-title">
        <div className="brand-mark" aria-hidden="true">S</div>
        <p className="eyebrow">SMAP</p>
        <h1 id="brand-title">Smart Mobility Alicante Platform</h1>
        <p>Web demo · Alicante · AVANZA concept</p>
      </section>
      <section className="auth-card" aria-labelledby="login-title">
        <h2 id="login-title">Iniciar sesión</h2>
        <AuthForm mode="login" />
        <p className="auth-switch">¿No tienes una cuenta? <Link href="/register">Crear cuenta</Link></p>
        <p className="auth-switch"><Link href="/status">Ver estado del servicio</Link></p>
        <div className="demo-credentials">
          <strong>Cuenta demo</strong>
          <span>demo@smap.local</span>
          <span>SmapDemo2026</span>
        </div>
      </section>
    </main>
  );
}
