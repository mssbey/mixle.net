'use client';

import { useRef, useState, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';

interface Props<T> {
  items: T[];
  getId: (item: T) => string;
  disabled?: boolean;
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: T) => ReactNode;
}

/** Basit HTML5 sürükle-bırak sıralama (yeni bağımlılık yok). */
export function ReorderableList<T>({
  items,
  getId,
  disabled,
  onReorder,
  renderItem,
}: Props<T>) {
  const [dragId, setDragId] = useState<string | null>(null);
  const overId = useRef<string | null>(null);

  const commit = () => {
    const from = dragId;
    const to = overId.current;
    setDragId(null);
    overId.current = null;
    if (!from || !to || from === to) return;
    const ids = items.map(getId);
    const fromIdx = ids.indexOf(from);
    const toIdx = ids.indexOf(to);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(toIdx, 0, ids.splice(fromIdx, 1)[0]);
    onReorder(ids);
  };

  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => {
        const id = getId(item);
        return (
          <li
            key={id}
            draggable={!disabled}
            onDragStart={() => setDragId(id)}
            onDragEnter={() => {
              overId.current = id;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={commit}
            onDrop={commit}
            className={`flex items-center gap-2 rounded-xl border border-[var(--admin-line)] bg-white p-2.5 ${
              dragId === id ? 'admin-row-dragging' : ''
            }`}
          >
            <span
              className="admin-drag-handle"
              aria-hidden="true"
              title={disabled ? undefined : 'Sürükleyip sıralayın'}
            >
              <GripVertical size={15} />
            </span>
            <div className="min-w-0 flex-1">{renderItem(item)}</div>
          </li>
        );
      })}
    </ul>
  );
}
