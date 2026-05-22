import { User, ShieldCheck, ChevronDown } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from '../components/Layout';

export default function EmployeeForm({ mode = "add" }) {
    const location = useLocation();
    const navigate = useNavigate();
    const employee = location.state?.employee;
    const isEditMode = location.state?.mode === "edit" || mode === "edit";
    const lineOptions = ["name_1234", "line_admin", "staff_group_a"];
    const employeeValues = {
        name: employee?.name ?? "",
        dept: employee?.dept ?? "",
        manager: employee?.manager ?? "",
        proxy1: employee?.proxy1 ?? "",
        proxy2: employee?.proxy2 ?? "",
        lineId: employee?.lineId ?? "",
        role: employee?.role === "部門主管" ? "manager" : employee?.role === "系統管理員" ? "admin" : "staff",
    };

    return (
        <Layout title={isEditMode ? "編輯員工" : "新增員工"} showBack>
            <div className="max-w-4xl mx-auto space-y-8">
                <section className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
                    <div className="h-1.5 bg-primary w-full"></div>
                    <form className="p-8">
                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-outline-variant pb-4">
                            <div className="flex items-center gap-2">
                                <User className="text-primary" size={20} />
                                <h2 className="text-lg font-bold text-primary">
                                    {isEditMode ? "員工資料編輯" : "員工資料新增"}
                                </h2>
                            </div>
                            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                                <button
                                    type="button"
                                    onClick={() => navigate("/employeeList")}
                                    className="px-5 py-2 border border-outline rounded-lg text-secondary hover:bg-surface-container transition-colors text-sm font-bold"
                                >
                                    取消
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate("/employeeList")}
                                    className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container transition-colors text-sm font-bold"
                                >
                                    儲存變更
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="name">
                                    姓名
                                </label>
                                <input
                                    id="name"
                                    defaultValue={employeeValues.name}
                                    placeholder="請輸入姓名"
                                    className="w-full h-11 px-4 bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="dept">
                                    部門
                                </label>
                                <div className="relative">
                                    <select
                                        id="dept"
                                        defaultValue={employeeValues.dept}
                                        className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                    >
                                        <option value="">請選擇部門</option>
                                        <option value="技術開發部">技術開發部</option>
                                        <option value="人力資源部">人力資源部</option>
                                        <option value="業務銷售部">業務銷售部</option>
                                        <option value="行政管理部">行政管理部</option>
                                        <option value="產品開發部">產品開發部</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="manager">
                                    部門主管
                                </label>
                                <div className="relative">
                                    <select
                                        id="manager"
                                        defaultValue={employeeValues.manager}
                                        className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                    >
                                        <option value="">請選擇部門主管</option>
                                        <option value="林曉明">林曉明</option>
                                        <option value="陳淑芬">陳淑芬</option>
                                        <option value="王大維">王大維</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                </div>
                            </div>

                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="proxy1">
                                        代理人 1
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="proxy1"
                                            defaultValue={employeeValues.proxy1}
                                            className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                        >
                                            <option value="">請選擇代理人 1</option>
                                            <option value="林曉明">林曉明</option>
                                            <option value="陳淑芬">陳淑芬</option>
                                            <option value="王大維">王大維</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="proxy2">
                                        代理人 2
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="proxy2"
                                            defaultValue={employeeValues.proxy2}
                                            className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                        >
                                            <option value="">請選擇代理人 2</option>
                                            <option value="林曉明">林曉明</option>
                                            <option value="陳淑芬">陳淑芬</option>
                                            <option value="王大維">王大維</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="line">
                                    LINE 名稱
                                </label>
                                <div className="relative">
                                    <select
                                        id="line"
                                        defaultValue={employeeValues.lineId}
                                        className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                    >
                                        <option value="">請選擇 LINE 名稱</option>
                                        {employeeValues.lineId && !lineOptions.includes(employeeValues.lineId) ? (
                                            <option value={employeeValues.lineId}>{employeeValues.lineId}</option>
                                        ) : null}
                                        {lineOptions.map((lineOption) => (
                                            <option key={lineOption} value={lineOption}>
                                                {lineOption}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest" htmlFor="role">
                                    系統角色
                                </label>
                                <div className="relative">
                                    <select
                                        id="role"
                                        defaultValue={employeeValues.role}
                                        className="w-full h-11 px-4 appearance-none bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-on-surface text-sm"
                                    >
                                        <option value="manager">部門主管</option>
                                        <option value="admin">系統管理員</option>
                                        <option value="staff">一般員工</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" size={18} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 bg-surface-container-low rounded-xl p-5 flex items-start gap-4 border border-outline-variant/30">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                                <ShieldCheck size={22} />
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-bold text-on-surface">權限設定</div>
                                <div className="text-[13px] text-on-surface-variant">
                                    設定員工基本資料、代理人與系統角色，儲存後即套用到員工管理清單。
                                </div>
                            </div>
                        </div>
                    </form>
                </section>
            </div>
        </Layout>
    );
}
