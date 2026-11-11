import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { workspaceApi, errorMessage, type Space } from '../api/workspace';

const STORAGE_KEY = 'selectedCourseSpace';
const CHANGED_EVENT = 'coursespace:changed';
const RELOAD_EVENT = 'coursespace:reload';

const readStoredId = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

/** Chọn không gian môn học đang làm việc; mọi màn hình dùng chung lựa chọn này. */
export const selectSpace = (id: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn đổi lựa chọn trong phiên hiện tại.
  }
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: id }));
};

/** Báo cho mọi màn hình tải lại danh sách không gian (sau khi tạo, đổi trạng thái...). */
export const reloadSpaces = () => window.dispatchEvent(new Event(RELOAD_EVENT));

export interface SelectedSpaceState {
  spaces: Space[];
  space: Space | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Danh sách không gian môn học thật từ Group Service:
 * Điều phối viên / Giảng viên thấy mọi không gian, Sinh viên chỉ thấy môn mình có tên trong danh sách FAP.
 */
export const useSelectedSpace = (): SelectedSpaceState => {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(readStoredId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = user.role === 'Student' ? await workspaceApi.listMySpaces() : await workspaceApi.listSpaces();
      const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setSpaces(sorted);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Không tải được danh sách không gian môn học.'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
    const onChanged = (e: Event) => setSelectedId((e as CustomEvent<string>).detail);
    const onReload = () => void reload();
    const onRealtimeUpdate = () => void reload();

    window.addEventListener(CHANGED_EVENT, onChanged);
    window.addEventListener(RELOAD_EVENT, onReload);
    window.addEventListener('realtime:space-updated', onRealtimeUpdate);
    return () => {
      window.removeEventListener(CHANGED_EVENT, onChanged);
      window.removeEventListener(RELOAD_EVENT, onReload);
      window.removeEventListener('realtime:space-updated', onRealtimeUpdate);
    };
  }, [reload]);

  // Lựa chọn cũ không còn hợp lệ (đã xóa, hoặc giá trị mẫu cũ như "exe101") thì dùng không gian mới nhất.
  const space = spaces.find((s) => s.id === selectedId) ?? spaces[0] ?? null;

  useEffect(() => {
    if (space?.id) {
      window.dispatchEvent(new CustomEvent('realtime:join-space-intent', { detail: space.id }));
    }
  }, [space?.id]);

  return { spaces, space, loading, error, reload };
};
