"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

import styles from "./admin.module.css";

export function LoginClient() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/admin/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("Email unavailable");
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  if (sent) return <div className={styles.loginCard}><span className={styles.loginIcon}><Mail size={27} /></span><h1>Revisá tu correo</h1><p>Si tu dirección tiene acceso, recibirás un enlace para entrar. El enlace dura 15 minutos.</p><button className={styles.textButton} onClick={() => setSent(false)} type="button">Usar otro email</button></div>;
  return (
    <form className={styles.loginCard} onSubmit={submit}>
      <span className={styles.loginIcon}><Mail size={27} /></span>
      <h1>Ingresar a pedidos</h1>
      <p>Te enviaremos un enlace de acceso a tu correo autorizado.</p>
      <label htmlFor="admin-email">Email</label>
      <input id="admin-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" />
      {error && <p className={styles.formError} role="alert">No pudimos enviar el enlace. Intentá de nuevo más tarde.</p>}
      <button className={styles.primaryLink} type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar enlace"}</button>
    </form>
  );
}
