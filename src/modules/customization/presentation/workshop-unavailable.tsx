import Link from 'next/link';
import styles from './customization.module.css';
export function WorkshopUnavailable(){return <main className={styles.page}><div className={styles.pageHeading}><h1>Estamos preparando el creador</h1><p>En unos días vas a poder armar tu cuadro. Mientras tanto, podés recorrer las piezas disponibles en la tienda.</p></div><Link className={styles.primaryButton} href="/tienda">Explorar la tienda</Link></main>;}
