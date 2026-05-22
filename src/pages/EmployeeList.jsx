import { Plus, Download, Edit2, ChevronLeft, ChevronRight, Users as UsersIcon } from "lucide-react"
import { useNavigate } from 'react-router-dom';
import { Button } from "../components/Button"
import { cn } from '../data/utils';
import Layout from '../components/Layout';

const mockEmployees = [
    { id: "A123", name: "林曉明", dept: "技術開發部", role: "部門主管", lineId: "123" },
    { id: "A232", name: "陳淑芬", dept: "人力資源部", role: "系統管理員", lineId: "DSss" },
    { id: "A7723", name: "王大維", dept: "業務銷售部", role: "一般員工", lineId: "sazxs" },
    // Adding more to justify pagination UI
    ...Array.from({ length: 7 }).map((_, i) => ({
        id: `B${100 + i}`,
        name: `員工 ${i + 1}`,
        dept: "行政管理部",
        role: "一般員工",
        lineId: `line_${i}`
    }))
]

export default function EmployeeList() {
    const navigate = useNavigate();
    const handleEditEmployee = (employee) => {
        navigate('/employeeForm', {
            state: {
                mode: 'edit',
                employee,
            },
        });
    };

    return (
        <Layout title="員工管理">
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">員工管理</h2>
                    <p className="text-sm text-slate-500 mt-1">管理企業員工資訊、權限及假期餘額</p>
                </div>
                <Button
                    type="button"
                    onClick={() => navigate('/employeeForm')}
                    className="gap-2 bg-primary hover:bg-primary-container text-white"
                >
                    <Plus className="w-5 h-5" />
                    新增員工
                </Button>
            </div>

            {/* Stats Card */}
            <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-brand/10 rounded-sm text-brand">
                    <UsersIcon className="w-6 h-6" />
                </div>
                <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">總員工人數</span>
                    <div className="text-3xl font-bold text-slate-800">124</div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-sm border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 overflow-x-auto">
                    <div className="flex gap-3">
                        <select className="bg-white border border-slate-200 rounded-sm text-sm py-2 px-3 focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all text-slate-600">
                            <option>所有部門</option>
                            <option>技術開發部</option>
                            <option>人力資源部</option>
                            <option>業務銷售部</option>
                        </select>
                        <select className="bg-white border border-slate-200 rounded-sm text-sm py-2 px-3 focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all text-slate-600">
                            <option>所有權限角色</option>
                            <option>Manager</option>
                            <option>Admin</option>
                            <option>Staff</option>
                        </select>
                    </div>
                    <button className="text-slate-400 hover:text-brand flex items-center text-sm font-medium transition-colors gap-1">
                        <Download className="w-4 h-4" />
                        匯出報表
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                        <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-50/50">
                            <th className="px-6 py-4 border-b border-slate-100">員工姓名</th>
                            <th className="px-6 py-4 border-b border-slate-100">員編</th>
                            <th className="px-6 py-4 border-b border-slate-100">部門</th>
                            <th className="px-6 py-4 border-b border-slate-100">權限角色</th>
                            <th className="px-6 py-4 border-b border-slate-100">LINE 名稱</th>
                            <th className="px-6 py-4 border-b border-slate-100 text-center">編輯</th>
                        </tr>
                        </thead>
                        <tbody className="text-sm text-slate-600 divide-y divide-slate-100">
                        {mockEmployees.map((emp) => (
                            <tr
                                key={emp.id}
                                onClick={() => handleEditEmployee(emp)}
                                className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                            >
                                <td className="px-6 py-4 font-semibold text-slate-800">{emp.name}</td>
                                <td className="px-6 py-4 text-slate-500 font-mono text-xs">{emp.id}</td>
                                <td className="px-6 py-4">{emp.dept}</td>
                                <td className="px-6 py-4">
                    <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide inline-block",
                        emp.role === "部門主管" ? "bg-slate-100 text-slate-600" :
                            emp.role === "系統管理員" ? "bg-brand/10 text-brand" : "bg-slate-50 text-slate-400"
                    )}>
                      {emp.role}
                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-400">{emp.lineId}</td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleEditEmployee(emp);
                                        }}
                                        className="text-slate-300 hover:text-brand transition-colors p-1"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-400">
                        顯示 1 到 10 筆，共 124 筆資料
                    </p>
                    <div className="flex items-center space-x-1">
                        <button className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-50 rounded-sm">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center bg-brand text-white text-xs font-semibold rounded-sm">1</button>
                        <button className="w-8 h-8 flex items-center justify-center text-slate-600 text-xs font-medium hover:bg-slate-50 rounded-sm">2</button>
                        <button className="w-8 h-8 flex items-center justify-center text-slate-600 text-xs font-medium hover:bg-slate-50 rounded-sm">3</button>
                        <span className="text-slate-300 px-1 text-xs">...</span>
                        <button className="w-8 h-8 flex items-center justify-center text-slate-600 text-xs font-medium hover:bg-slate-50 rounded-sm">13</button>
                        <button className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-50 rounded-sm">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </Layout>
    )
}
