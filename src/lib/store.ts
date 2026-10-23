import type { Attachment, Performer, PerformerInput } from "./performer";

// 백엔드가 생기기 전까지 출연자는 이 브라우저의 IndexedDB에 저장한다.
// 첨부파일(Blob)도 그대로 저장할 수 있어 localStorage 대신 IndexedDB를 쓴다.
const DB_NAME = "cen-performers";
const STORE = "performers";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/** 최신 등록순 */
export async function listPerformers(): Promise<Performer[]> {
  const db = await openDb();
  const all = await new Promise<Performer[]>((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as Performer[]);
    req.onerror = () => reject(req.error);
  });
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addPerformer(input: PerformerInput, attachments: Attachment[]): Promise<void> {
  const performer: Performer = { ...input, id: crypto.randomUUID(), createdAt: Date.now(), attachments };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(performer);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
