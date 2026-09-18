import type { ReactNode } from "react";

interface Props {
  onClose: () => void;
  children: ReactNode;
  widthClass?: string;
}

export function Modal({ onClose, children, widthClass = "max-w-lg" }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        className={`w-full ${widthClass} max-h-[85vh] overflow-y-auto rounded-xl bg-oak-cream shadow-pop`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
