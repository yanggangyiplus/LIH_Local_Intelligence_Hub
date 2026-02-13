import { ReactNode } from 'react';

interface LayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export default function Layout({ sidebar, children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      <aside className="w-64 bg-white border-r border-gray-200 shrink-0">
        <div className="py-6 px-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">
            Local Intelligence Hub
          </h1>
          <p className="text-xs text-gray-500 mt-1">로컬 AI 워크스페이스</p>
        </div>
        {sidebar}
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
