"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { CatalogEntry } from "../infrastructure/postgres/catalog-repository";
import {
  publicationIssue,
  imageReferenceKey,
  type CatalogDocument,
  type CatalogKind,
} from "../domain/editor";
import type {
  InventoryRow,
  Stock,
} from "@/modules/inventory/domain/stock-edit";
import { PhotoFields, type ImagePreview } from "./photo-fields";
import { StockSection, type StockHistory } from "./stock-section";
import { MosaicSvg } from "@/modules/customization/presentation/mosaic-svg";
import {
  validateDesign,
  type MosaicDesign,
} from "@/modules/customization/domain/design";
import { CONTENT_CLASSIFICATIONS } from "@/modules/shipping/domain/content-classifications";
import styles from "./catalog-panel.module.css";
const sections: Record<CatalogKind, string> = {
  product: "Productos",
  box: "Cajas de envío",
  slide: "Carrusel",
  frame: "Catálogo de cuadros",
};
const subcategories: Record<string, string[]> = {
  vidrio: ["Reciclado", "Vitrofusión"],
  ceramica: ["Casa", "Jardín"],
  espejos: ["Espejos", "Cuadros"],
};
const path = (kind: CatalogKind, id?: string) =>
  `/admin/catalogo?tipo=${kind}${id ? `&editar=${encodeURIComponent(id)}` : ""}`;
type List = {
  entries: CatalogEntry[];
  hasNext: boolean;
  page: number;
  stocks: InventoryRow[];
  images: Record<string, ImagePreview>;
};
type Detail = {
  stockHistory?: StockHistory[];
  entry: CatalogEntry;
  stock: Stock | null;
  images: Record<string, ImagePreview>;
  history: { version: number; action: string; actor: string; at: string }[];
};
const blank: List = {
  entries: [],
  hasNext: false,
  page: 0,
  stocks: [],
  images: {},
};
async function post(body: unknown) {
  const r = await fetch("/api/admin/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error ?? "No pudimos guardar los cambios.");
  return data;
}
export function CatalogPanel() {
  const params = useSearchParams(),
    router = useRouter();
  const kind = (params.get("tipo") ?? "product") as CatalogKind,
    id = params.get("editar");
  const [list, setList] = useState<List>(blank),
    [detail, setDetail] = useState<Detail | null>(null),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [archived, setArchived] = useState(false),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [creating, setCreating] = useState(false),
    [moving, setMoving] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(
      () => {
        setLoading(true);
        setError("");
        const url = id
          ? `/api/admin/catalog?id=${encodeURIComponent(id)}`
          : `/api/admin/catalog?kind=${kind}&q=${encodeURIComponent(search)}&page=${page}&archived=${archived ? "1" : "0"}`;
        fetch(url, { signal: abort.signal, cache: "no-store" })
          .then(async (r) => {
            const data = await r.json();
            if (!r.ok) throw Error(data.error);
            if (!abort.signal.aborted) {
              if (id) setDetail(data);
              else {
                setList(data);
                setDetail(null);
              }
            }
          })
          .catch((e) => {
            if (!abort.signal.aborted)
              setError(e.message ?? "No pudimos cargar el catálogo.");
          })
          .finally(() => {
            if (!abort.signal.aborted) setLoading(false);
          });
      },
      search ? 220 : 0,
    );
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [kind, id, search, page, archived, revision]);
  async function move(entry: CatalogEntry, direction: "up" | "down") {
    if (moving) return;
    setMoving(true);
    setError("");
    try {
      await post({
        action: "move",
        id: entry.id,
        version: entry.version,
        direction,
      });
      setRevision((n) => n + 1);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos ordenar las fichas.",
      );
    } finally {
      setMoving(false);
    }
  }
  async function create() {
    if (creating) return;
    setCreating(true);
    setError("");
    try {
      const data = await post({
        action: "create",
        kind,
        document:
          kind === "box"
            ? { name: "Nueva caja", active: true }
            : kind === "frame"
              ? { title: "Nuevo cuadro" }
              : { name: kind === "product" ? "Nueva pieza" : "Nueva imagen" },
      });
      router.push(path(kind, data.entry.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos crear la ficha.");
    } finally {
      setCreating(false);
    }
  }
  if (!sections[kind])
    return (
      <main className={styles.page}>
        <h1>Sección no encontrada</h1>
        <Link href="/admin/catalogo">Volver al catálogo</Link>
      </main>
    );
  return (
    <main className={styles.page}>
      {!id && (
        <>
          <div className={styles.top}>
            <div>
              <h1>Catálogo y stock</h1>
              <p>Prepará tus fichas y publicalas cuando estén listas.</p>
            </div>
            <button
              className={styles.primary}
              disabled={creating}
              onClick={() => void create()}
            >
              {creating
                ? "Creando…"
                : `Agregar ${kind === "product" ? "producto" : kind === "box" ? "caja" : kind === "frame" ? "cuadro" : "imagen"}`}
            </button>
          </div>
          <nav className={styles.tabs} aria-label="Secciones del catálogo">
            {Object.entries(sections).map(([key, label]) => (
              <Link
                key={key}
                aria-current={kind === key ? "page" : undefined}
                href={path(key as CatalogKind)}
                onClick={() => {
                  setPage(0);
                  setSearch("");
                  setArchived(false);
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className={styles.filters}>
            <label>
              Buscar en {sections[kind].toLowerCase()}
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Nombre de la ficha"
              />
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => {
                  setArchived(e.target.checked);
                  setPage(0);
                }}
              />
              Mostrar archivados
            </label>
          </div>
        </>
      )}
      {error && (
        <div role="alert" className={styles.error}>
          {error}{" "}
          <button onClick={() => setRevision((n) => n + 1)}>
            Volver a intentar
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">Cargando {id ? "ficha" : "catálogo"}…</p>
      ) : id ? (
        detail && (
          <CatalogEditor
            key={`${id}-${revision}`}
            initial={detail}
            onRefresh={() => setRevision((n) => n + 1)}
            onCopied={(newId) => router.push(path(kind, newId))}
          />
        )
      ) : (
        <>
          {list.entries.length ? (
            <div className={styles.list}>
              {list.entries.map((entry) => {
                const image = entry.draft.images?.[0] ?? entry.draft.image,
                  preview = image
                    ? list.images[imageReferenceKey(image)]
                    : null,
                  stock = list.stocks.find((s) => s.id === entry.id);
                return (
                  <article className={styles.item} key={entry.id}>
                                        {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview.url} alt="" loading="lazy" />
                    ) : (
                      <div className={styles.placeholder}>
                        {entry.kind === "frame" ? "Cuadro" : "Sin foto"}
                      </div>
                    )}
                    <div>
                      <h2>
                        <Link href={path(kind, entry.id)}>
                          {entry.draft.name ??
                            entry.draft.title ??
                            "Sin nombre"}
                        </Link>
                      </h2>
                      <p className={styles.status}>
                        {entry.archived
                          ? "Archivado"
                          : entry.published
                            ? "Publicado"
                            : "Borrador"}
                      </p>
                      {publicationIssue(entry.kind, entry.draft) && (
                        <p className={styles.attention}>
                          Faltan datos para vender
                        </p>
                      )}
                      {stock && (
                        <p>
                          {Math.max(0, stock.stockOnHand - stock.reserved)}{" "}
                          disponibles
                          {stock.reserved > 0
                            ? ` · ${stock.reserved} reservadas`
                            : ""}
                        </p>
                      )}
                      {typeof entry.draft.price === "number" && (
                        <p>{money(entry.draft.price)}</p>
                      )}
                    </div>
                    <div>
                      <Link
                        className={styles.button}
                        href={path(kind, entry.id)}
                      >
                        Editar
                      </Link>
                      <div className={styles.photoActions}>
                        <button
                          type="button"
                          disabled={moving}
                          aria-label={`Mover ${entry.draft.name ?? entry.draft.title} antes`}
                          onClick={() => void move(entry, "up")}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={moving}
                          aria-label={`Mover ${entry.draft.name ?? entry.draft.title} después`}
                          onClick={() => void move(entry, "down")}
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>
              <h2>
                {search
                  ? "No encontramos coincidencias"
                  : archived
                    ? "No hay fichas archivadas"
                    : "Todavía no hay fichas"}
              </h2>
              <p>
                {search
                  ? "Probá con otro nombre."
                  : archived
                    ? "Las fichas que archives aparecerán acá."
                    : "Podés guardar por partes y publicar más adelante."}
              </p>
              {!search && !archived && (
                <button onClick={() => void create()}>
                  Crear la primera ficha
                </button>
              )}
            </div>
          )}
          <div className={styles.pagination}>
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <span>Página {page + 1}</span>
            <button
              disabled={!list.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </main>
  );
}
function CatalogEditor({
  initial,
  onRefresh,
  onCopied,
}: {
  initial: Detail;
  onRefresh: () => void;
  onCopied: (id: string) => void;
}) {
  const [history, setHistory] = useState(initial.history),
    [saved, setSaved] = useState(initial.entry),
    [doc, setDoc] = useState<CatalogDocument>(initial.entry.draft),
    [images, setImages] = useState(initial.images),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [dirty, setDirty] = useState(false),
    [stockDirty, setStockDirty] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const pending = useRef(false),
    form = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    if (!dirty && !stockDirty && !uploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, stockDirty, uploading]);
  const edit = (value: Partial<CatalogDocument>) => {
    setDoc((d) => ({ ...d, ...value }));
    setDirty(true);
    setNotice("");
  };
  const profile = doc.shippingProfile ?? {};
  const issue = publicationIssue(saved.kind, doc);
  const editShipping = (key: string, value: unknown) =>
    edit({ shippingProfile: { ...profile, [key]: value } });
  async function action(name: string) {
    if (pending.current || uploading) return;
    if (name === "publish" && !form.current?.reportValidity()) return;
    if (
      ["archive", "unpublish", "restore"].includes(name) &&
      dirty &&
      !window.confirm(
        "Hay cambios en la ficha sin guardar. ¿Descartarlos y continuar?",
      )
    )
      return;
    if (
      ["archive", "unpublish"].includes(name) &&
      !window.confirm(
        name === "archive"
          ? "¿Archivar esta ficha? Se retirará del catálogo y podrás restaurarla."
          : "¿Retirar esta ficha del catálogo público? El borrador se conserva.",
      )
    )
      return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await post({
        id: saved.id,
        version: saved.version,
        action: name,
        document: doc,
      });
      if (name === "duplicate") {
        onCopied(result.entry.id);
        return;
      }
      setHistory((h) =>
        [
          {
            version: result.entry.version,
            action: name,
            actor: result.entry.updated_by,
            at: result.entry.updated_at,
          },
          ...h,
        ].slice(0, 30),
      );
      setSaved(result.entry);
      setDoc(result.entry.draft);
      setDirty(false);
      setNotice(
        (
          {
            save: "Borrador guardado.",
            publish: "Ficha publicada.",
            archive: "Ficha archivada.",
            restore: "Ficha restaurada.",
            unpublish: "Ficha retirada del catálogo.",
          } as Record<string, string>
        )[name],
      );
      if (name === "save" || name === "publish") {
        const r = await fetch(
          `/api/admin/catalog?id=${encodeURIComponent(saved.id)}`,
          { cache: "no-store" },
        );
        if (r.ok) setImages((await r.json()).images);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const field = (
    key: keyof CatalogDocument,
    label: string,
    required = false,
    multiline = false,
  ) => (
    <label className={multiline ? styles.wide : undefined}>
      {label}
      {!required && <small>Opcional</small>}
      {multiline ? (
        <textarea
          rows={4}
          maxLength={4000}
          value={String(doc[key] ?? "")}
          onChange={(e) => edit({ [key]: e.target.value })}
        />
      ) : (
        <input
          required={required}
          maxLength={200}
          value={String(doc[key] ?? "")}
          onChange={(e) => edit({ [key]: e.target.value })}
        />
      )}
    </label>
  );
  const number = (key: keyof CatalogDocument, label: string, step = "1") => (
    <label>
      {label}
      <input
        type="number"
        required
        min={step === "0.01" ? 0.01 : 1}
        max={10000000}
        step={step}
        value={typeof doc[key] === "number" ? String(doc[key]) : ""}
        onChange={(e) =>
          edit({ [key]: e.target.value === "" ? null : Number(e.target.value) })
        }
      />
    </label>
  );
  let design: MosaicDesign | undefined;
  try {
    if (doc.designJson) {
      design = JSON.parse(doc.designJson);
      validateDesign(design!);
    }
  } catch {
    design = undefined;
  }
  return (
    <>
      <Link
        className={styles.back}
        href={path(saved.kind)}
        onClick={(e) => {
          if (
            (dirty || stockDirty || uploading) &&
            !window.confirm("Tenés cambios sin guardar. ¿Volver al listado?")
          )
            e.preventDefault();
        }}
      >
        Volver a {sections[saved.kind].toLowerCase()}
      </Link>
      <div className={styles.top}>
        <div>
          <h1>{saved.draft.name ?? saved.draft.title ?? "Nueva ficha"}</h1>
          <p>
            {saved.archived
              ? "Archivado"
              : saved.published
                ? "Publicado"
                : "Borrador"}
            {dirty ? " · Cambios sin guardar" : ""}
          </p>
        </div>
        <button
          disabled={busy || uploading}
          onClick={() => {
            if (
              (!dirty && !stockDirty) ||
              window.confirm(
                "¿Descartar los cambios de esta pantalla y recargar la ficha?",
              )
            )
              onRefresh();
          }}
        >
          Recargar ficha
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={styles.message}>
          {notice}
        </p>
      )}
      <div className={styles.editor}>
        <div>
          <form
            ref={form}
            onSubmit={(e) => {
              e.preventDefault();
              void action("publish");
            }}
          >
            <fieldset disabled={busy}>
              <section className={styles.section}>
                <h2>
                  {saved.kind === "product"
                    ? "Datos de la pieza"
                    : saved.kind === "frame"
                      ? "Diseño del cuadro"
                      : saved.kind === "box"
                        ? "Caja de envío"
                        : "Imagen del carrusel"}
                </h2>
                <p>
                  Los campos opcionales están indicados. Podés guardar un
                  borrador aunque falten datos.
                </p>
                <div className={styles.grid}>
                  {field(
                    saved.kind === "frame" ? "title" : "name",
                    saved.kind === "frame" ? "Título" : "Nombre",
                    true,
                  )}
                  {saved.kind === "product" &&
                    number("price", "Precio (ARS)", "0.01")}
                  {(saved.kind === "product" || saved.kind === "slide") && (
                    <label>
                      Categoría
                      <select
                        required
                        value={doc.category ?? ""}
                        onChange={(e) =>
                          edit({ category: e.target.value, sub: "" })
                        }
                      >
                        <option value="">Seleccioná una categoría</option>
                        <option value="vidrio">Vidrio</option>
                        <option value="ceramica">Cerámica</option>
                        <option value="espejos">Espejos y cuadros</option>
                      </select>
                    </label>
                  )}
                  {saved.kind === "product" && (
                    <label>
                      Subcategoría
                      <select
                        required
                        value={doc.sub ?? ""}
                        onChange={(e) => edit({ sub: e.target.value })}
                      >
                        <option value="">Seleccioná una subcategoría</option>
                        {(subcategories[doc.category ?? ""] ?? []).map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {(saved.kind === "product" || saved.kind === "frame") &&
                    field("description", "Descripción", false, true)}
                  {saved.kind === "product" && (
                    <>
                      {field("medidas", "Medidas para mostrar al comprador")}
                      {field("material", "Material")}
                    </>
                  )}
                  {saved.kind === "slide" &&
                    field("caption", "Texto breve sobre la imagen", true)}
                  {saved.kind === "box" && (
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={doc.active ?? true}
                        onChange={(e) => edit({ active: e.target.checked })}
                      />
                      Disponible para preparar pedidos
                    </label>
                  )}
                </div>
              </section>
              {(saved.kind === "product" || saved.kind === "slide") && (
                <section className={styles.section}>
                  <h2>Fotos</h2>
                  <p>
                    Subí fotos de la pieza que va a recibir el comprador. Podés
                    cambiar su orden y encuadre.
                  </p>
                  <PhotoFields
                    key={saved.version}
                    photos={
                      saved.kind === "product"
                        ? (doc.images ?? [])
                        : doc.image
                          ? [doc.image]
                          : []
                    }
                    previews={images}
                    onChange={(photos) =>
                      edit(
                        saved.kind === "product"
                          ? { images: photos }
                          : { image: photos[0] ?? null },
                      )
                    }
                    onPreview={(preview) =>
                      setImages((p) => ({ ...p, [preview.assetId]: preview }))
                    }
                    single={saved.kind === "slide"}
                    onBusy={setUploading}
                  />
                </section>
              )}
              {saved.kind === "product" && (
                <section className={styles.section}>
                  <h2>Medidas para el envío</h2>
                  <p>
                    Medí y pesá la pieza con su protección individual, sin la
                    caja exterior. Estos datos se usan para armar el paquete y
                    cotizar el envío; no se muestran al comprador.
                  </p>
                  <div className={styles.grid}>
                    {(
                      [
                        ["weightGrams", "Peso con protección (g)"],
                        ["widthCm", "Ancho con protección (cm)"],
                        ["lengthCm", "Largo con protección (cm)"],
                        ["heightCm", "Alto con protección (cm)"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          type="number"
                          min="1"
                          max={10000000}
                          required
                          step="1"
                          value={profile[key] ?? ""}
                          onChange={(e) =>
                            editShipping(
                              key,
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                            )
                          }
                        />
                      </label>
                    ))}
                    <label className={styles.wide}>
                      Contenido del envío
                      <select
                        required
                        value={profile.classificationId ?? ""}
                        onChange={(e) =>
                          editShipping("classificationId", e.target.value)
                        }
                      >
                        <option value="">Seleccioná el contenido</option>
                        {CONTENT_CLASSIFICATIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p>
                    Redondeá las medidas hacia arriba al centímetro. La caja
                    exterior y el margen de seguridad se suman al cotizar.
                  </p>
                  {(
                    [
                      [
                        "canRotate",
                        "Se puede girar sobre su base sin acostarla",
                      ],
                      [
                        "canStack",
                        "Puede llevar otras piezas protegidas encima",
                      ],
                      ["shipSeparately", "Necesita viajar sola en su caja"],
                    ] as const
                  ).map(([key, label]) => (
                    <label className={styles.check} key={key}>
                      <input
                        type="checkbox"
                        checked={profile[key] === true}
                        onChange={(e) => editShipping(key, e.target.checked)}
                      />
                      {label}
                    </label>
                  ))}
                </section>
              )}
              {saved.kind === "box" && (
                <section className={styles.section}>
                  <h2>Medidas y capacidad</h2>
                  <p>
                    El espacio interior sirve para acomodar las piezas. El
                    exterior y el peso de la caja vacía se usan para cotizar.
                  </p>
                  <div className={styles.grid}>
                    {(
                      [
                        ["innerWidthCm", "Ancho interior (cm)"],
                        ["innerLengthCm", "Largo interior (cm)"],
                        ["innerHeightCm", "Alto interior (cm)"],
                        ["widthCm", "Ancho exterior (cm)"],
                        ["lengthCm", "Largo exterior (cm)"],
                        ["heightCm", "Alto exterior (cm)"],
                        ["tareWeightGrams", "Peso de la caja vacía (g)"],
                        ["maxWeightGrams", "Peso total máximo admitido (g)"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key}>{number(key, label)}</div>
                    ))}
                  </div>
                </section>
              )}
              {saved.kind === "frame" && (
                <section className={styles.section}>
                  <h2>Vista del cuadro</h2>
                  {design ? (
                    <div className={styles.design}>
                      <MosaicSvg design={design} label="Diseño del cuadro" />
                    </div>
                  ) : (
                    <p>
                      Prepará un diseño desde un pedido autorizado para
                      mostrarlo acá.
                    </p>
                  )}
                  <details>
                    <summary>Archivo del diseño</summary>
                    <p>
                      Usá el diseño exportado desde un pedido con autorización
                      del comprador. Las fotos originales nunca se publican.
                    </p>
                    <label>
                      Cargar diseño JSON
                      <input
                        type="file"
                        accept="application/json,.json"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 200000) {
                            setError(
                              "El archivo del diseño es demasiado grande.",
                            );
                            return;
                          }
                          try {
                            const text = await file.text();
                            validateDesign(JSON.parse(text));
                            edit({ designJson: text });
                          } catch {
                            setError(
                              "El archivo no contiene un diseño válido.",
                            );
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </details>
                </section>
              )}
            </fieldset>
          </form>
          {saved.kind === "product" && initial.stock && (
            <StockSection
              id={saved.id}
              initial={initial.stock}
              history={initial.stockHistory}
              onDirty={setStockDirty}
            />
          )}
        </div>
        <aside className={styles.aside}>
          <section className={styles.section}>
            <h2>Guardar y publicar</h2>
            {issue && <p className={styles.attention}>{issue}</p>}
            <p className={styles.meta}>
              Guardar el borrador conserva tus cambios. Publicar los muestra en
              el catálogo cuando la tienda esté abierta.
            </p>
            <button
              disabled={busy || uploading}
              onClick={() => void action("save")}
            >
              {busy ? "Guardando…" : "Guardar borrador"}
            </button>
            <button
              className={styles.primary}
              disabled={busy || uploading || saved.archived}
              onClick={() => void action("publish")}
            >
              Publicar ficha
            </button>
            {saved.published && !saved.archived && (
              <button
                disabled={busy || uploading}
                onClick={() => void action("unpublish")}
              >
                Despublicar
              </button>
            )}
            {saved.archived && (
              <button
                disabled={busy || uploading}
                onClick={() => void action("restore")}
              >
                Restaurar ficha
              </button>
            )}
            <p className={styles.meta}>
              Publicar no cambia el mantenimiento de la tienda.
            </p>
          </section>
          <section className={styles.section}>
            <h2>Más opciones</h2>
            <button
              disabled={busy || uploading || dirty || stockDirty}
              onClick={() => void action("duplicate")}
            >
              Duplicar ficha
            </button>
            {dirty && (
              <p className={styles.meta}>
                Guardá los cambios antes de duplicar.
              </p>
            )}
            {!saved.archived && (
              <button
                disabled={busy || uploading}
                onClick={() => void action("archive")}
              >
                Archivar ficha
              </button>
            )}
            <details style={{ marginTop: 20 }}>
              <summary>Últimos cambios</summary>
              <ul className={styles.history}>
                {history.map((h, i) => (
                  <li key={i}>
                    {new Date(h.at).toLocaleDateString("es-AR")} ·{" "}
                    {(
                      {
                        create: "Creada",
                        save: "Borrador guardado",
                        publish: "Publicada",
                        unpublish: "Despublicada",
                        archive: "Archivada",
                        restore: "Restaurada",
                        reorder: "Orden actualizado",
                        import: "Importada",
                      } as Record<string, string>
                    )[h.action] ?? h.action}{" "}
                    · {h.actor}
                  </li>
                ))}
              </ul>
            </details>
          </section>
        </aside>
      </div>
    </>
  );
}
function money(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(value);
}
