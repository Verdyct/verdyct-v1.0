import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import UploadModal from "@/components/UploadModal";
import { UploadModalProvider } from "@/lib/upload-modal-context";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen overflow-hidden">
      <UploadModalProvider>
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
        <UploadModal />
      </UploadModalProvider>
    </div>
  );
}
