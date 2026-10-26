import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import styles from "./admin.module.css";

export function ReviewBadge() {
  return <span className={`${styles.statusBadge} ${styles.statusAttention}`}>
    <TriangleAlert size={14} aria-hidden="true" />
    <span>Necesita revisión</span>
  </span>;
}

export function ReviewNotice({ children }: { children: ReactNode }) {
  return <div className={styles.reviewNotice} role="note" aria-label="Necesita revisión">
    <TriangleAlert size={22} aria-hidden="true" />
    <div>
      <strong>Necesita revisión</strong>
      <p className={styles.reviewPriority}>Revisar con prioridad</p>
      {children}
    </div>
  </div>;
}
