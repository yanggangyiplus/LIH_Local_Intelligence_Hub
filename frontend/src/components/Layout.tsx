import { ReactNode } from 'react';

interface LayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export default function Layout({ sidebar, children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-700">
      <aside className="w-64 bg-gray-800 border-r border-gray-600 shrink-0">
        <div className="py-6 px-4 border-b border-gray-600">
          <h1 className="text-lg font-semibold text-white">
            Local Intelligence Hub
          </h1>
          <p className="text-xs text-gray-300 mt-1">로컬 AI 워크스페이스</p>
        </div>
        {sidebar}
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
