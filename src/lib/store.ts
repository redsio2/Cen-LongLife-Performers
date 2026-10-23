import type { Memo, Performer } from "./performer";

// 백엔드가 생기기 전까지 출연자는 이 브라우저의 IndexedDB에 저장한다.
// 첨부파일(Blob)도 그대로 저장할 수 있어 localStorage 대신 IndexedDB를 쓴다.
// 메모는 출연자 기록과 따로 "memos"에 두고 performerId로 찾는다. (DB의 memos 테이블과 같은 구조)
const DB_NAME = "cen-performers";
const PERFORMERS = "performers";
const MEMOS = "memos";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (e.oldVersion < 1) db.createObjectStore(PERFORMERS, { keyPath: "id" });
      if (e.oldVersion < 2) db.createObjectStore(MEMOS, { keyPath: "id" }).createIndex("performerId", "performerId");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** 최신 등록순 */
export async function listPerformers(): Promise<Performer[]> {
  const db = await openDb();
  const all = (await request(db.transaction(PERFORMERS).objectStore(PERFORMERS).getAll())) as Performer[];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPerformer(id: string): Promise<Performer | undefined> {
  const db = await openDb();
  return (await request(db.transaction(PERFORMERS).objectStore(PERFORMERS).get(id))) as Performer | undefined;
}

/** 출연자의 메모, 최신 작성순 */
export async function listMemos(performerId: string): Promise<Memo[]> {
  const db = await openDb();
  const index = db.transaction(MEMOS).objectStore(MEMOS).index("performerId");
  const memos = (await request(index.getAll(performerId))) as Memo[];
  return memos.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 출연자와 그 메모를 한 번에 저장한다. 메모는 넘긴 목록으로 통째로 바꾼다.
 * (목록에 없는 기존 메모는 지운다)
 */
export async function savePerformer(performer: Performer, memos: Memo[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([PERFORMERS, MEMOS], "readwrite");
  tx.objectStore(PERFORMERS).put(performer);
  const memoStore = tx.objectStore(MEMOS);
  const keep = new Set(memos.map((m) => m.id));
  const existing = await request(memoStore.index("performerId").getAllKeys(performer.id));
  for (const key of existing) if (!keep.has(String(key))) memoStore.delete(key);
  for (const memo of memos) memoStore.put({ ...memo, performerId: performer.id });
  await done(tx);
}

/** 출연자와 그 메모를 함께 지운다. */
export async function deletePerformer(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([PERFORMERS, MEMOS], "readwrite");
  tx.objectStore(PERFORMERS).delete(id);
  const memoStore = tx.objectStore(MEMOS);
  const keys = await request(memoStore.index("performerId").getAllKeys(id));
  for (const key of keys) memoStore.delete(key);
  await done(tx);
}
