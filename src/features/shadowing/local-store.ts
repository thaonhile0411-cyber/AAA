import type { Recording } from "./types";

export type SavedRecording = Recording & { userId: string; questionId: string };
const dbName = "aaa-shadowing-private-v1";
function scopeKey(userId: string, questionId: string) {
  if (!userId || !questionId)
    throw new Error("Cần tài khoản và câu hỏi để lưu riêng bản thu.");
  return JSON.stringify([userId, questionId]);
}
export function createPracticeStore(factory: IDBFactory) {
  function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = factory.open(dbName, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("recordings");
        request.result.createObjectStore("completions");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error("Không mở được bộ nhớ riêng trên thiết bị."));
      request.onblocked = () =>
        reject(new Error("Đóng các tab Shadowing cũ rồi thử lại."));
    });
  }
  async function transact<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await open();
    return new Promise((resolve, reject) => {
      let result: T;
      const transaction = db.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));
      request.onsuccess = () => {
        result = request.result;
      };
      transaction.oncomplete = () => {
        db.close();
        resolve(result);
      };
      transaction.onabort = transaction.onerror = () => {
        db.close();
        reject(
          new Error(
            "Không lưu được trên thiết bị. Bản thu tạm vẫn còn; hãy thử lại hoặc tải xuống.",
          ),
        );
      };
    });
  }
  return {
    async save(userId: string, questionId: string, recording: Recording) {
      if (
        !recording.blob.size ||
        recording.blob.size > 20 * 1024 * 1024 ||
        !recording.blob.type.startsWith("audio/") ||
        !Number.isFinite(recording.duration) ||
        recording.duration < 0.5 ||
        recording.duration > 181 ||
        !Number.isFinite(Date.parse(recording.createdAt))
      )
        throw new Error("Bản thu trống hoặc không hợp lệ.");
      const value: SavedRecording = { ...recording, userId, questionId };
      await transact("recordings", "readwrite", (store) =>
        store.put(value, scopeKey(userId, questionId)),
      );
    },
    async load(
      userId: string,
      questionId: string,
    ): Promise<SavedRecording | undefined> {
      const value = await transact<SavedRecording | undefined>(
        "recordings",
        "readonly",
        (store) => store.get(scopeKey(userId, questionId)),
      );
      return value?.userId === userId &&
        value.questionId === questionId &&
        value.blob instanceof Blob &&
        value.blob.size > 0
        ? value
        : undefined;
    },
    async remove(userId: string, questionId: string) {
      await transact("recordings", "readwrite", (store) =>
        store.delete(scopeKey(userId, questionId)),
      );
    },
    async completed(userId: string, questionId: string) {
      const value = await transact<
        { userId: string; questionId: string } | undefined
      >("completions", "readonly", (store) =>
        store.get(scopeKey(userId, questionId)),
      );
      return value?.userId === userId && value.questionId === questionId;
    },
    async complete(userId: string, questionId: string): Promise<boolean> {
      const db = await open();
      const key = scopeKey(userId, questionId);
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("completions", "readwrite");
        const store = transaction.objectStore("completions");
        let added = false;
        const get = store.get(key);
        get.onsuccess = () => {
          if (!get.result) {
            store.add(
              { userId, questionId, completedAt: new Date().toISOString() },
              key,
            );
            added = true;
          }
        };
        transaction.oncomplete = () => {
          db.close();
          resolve(added);
        };
        transaction.onabort = transaction.onerror = () => {
          db.close();
          reject(new Error("Chưa lưu được hoàn thành. Hãy thử lại."));
        };
      });
    },
  };
}
