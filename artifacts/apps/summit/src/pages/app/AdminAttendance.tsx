import { useState, useEffect } from "react";
import { 
  Download, 
  RefreshCw, 
  Search, 
  Clock, 
  UserCheck, 
  LogOut, 
  LogIn, 
  Cpu,
  FileSpreadsheet
} from "lucide-react";

interface AttendanceRecord {
  id: string;
  userCode: string;
  userName: string;
  type: string;
  deviceId: string;
  method: string;
  checkedInAt: string;
}

export default function AdminAttendance() {
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance/logs");
      if (!res.ok) {
        throw new Error(`Failed to fetch logs: ${res.statusText}`);
      }
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách điểm danh");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(
    (log) =>
      log.userCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.deviceId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLogs = logs.length;
  const inCount = logs.filter((l) => l.type?.toUpperCase() === "VAO").length;
  const outCount = logs.filter((l) => l.type?.toUpperCase() === "RA").length;

  const handleExportCSV = () => {
    window.open("/api/attendance/export", "_blank");
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Điểm Danh Nhân Viên & Học Sinh (Pi 5)</h1>
          <p className="text-muted-foreground text-base mt-1">
            Quản lý nhật ký điểm danh thực tế từ máy chấm công Raspberry Pi 5 và xuất báo cáo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-input bg-background hover:bg-muted font-medium transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Tải lại</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất file điểm danh (Excel/CSV)</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-card border rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">Tổng lượt điểm danh</p>
            <p className="text-3xl font-bold">{totalLogs}</p>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">Lượt VÀO (Check-in)</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{inCount}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <LogIn className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">Lượt RA (Check-out)</p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{outCount}</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <LogOut className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-2xl border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo Mã NV / Mã học sinh, Họ tên, Thiết bị..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground text-sm">Đang tải nhật ký điểm danh từ CSDL...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive space-y-2">
            <p className="font-semibold">⚠️ {error}</p>
            <button onClick={fetchLogs} className="text-xs underline">Thử lại</button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto opacity-50" />
            <p className="font-medium">Chưa có bản ghi điểm danh nào phù hợp</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                <tr>
                  <th className="px-6 py-4">Mã NV / Học Sinh</th>
                  <th className="px-6 py-4">Họ & Tên</th>
                  <th className="px-6 py-4">Trạng Thái</th>
                  <th className="px-6 py-4">Thiết Bị Ghi Nhận</th>
                  <th className="px-6 py-4">Thời Gian Quét</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => {
                  const isVao = log.type?.toUpperCase() === "VAO";
                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-foreground">
                        {log.userCode}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {log.userName}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                            isVao
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {isVao ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                          {isVao ? "VÀO (Check-in)" : "RA (Check-out)"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Cpu className="w-3.5 h-3.5 text-primary" />
                          <span className="capitalize">{log.deviceId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {new Date(log.checkedInAt).toLocaleString("vi-VN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
