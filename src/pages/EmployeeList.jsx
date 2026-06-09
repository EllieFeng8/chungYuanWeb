import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { Plus, Download, Edit2, ChevronLeft, ChevronRight, Users as UsersIcon } from "lucide-react"
import { useNavigate } from 'react-router-dom';
import { Button } from "../components/Button"
import { cn } from '../data/utils';
import Layout from '../components/Layout';
import { getEmployeeList } from '../lib/cfctApi';

const WORK_STATUS_LABELS = {
    active: '在職',
    resigned: '離職',
};
const ROLE_LABELS = {
    admin: '系統管理員',
    manager: '部門主管',
    member: '一般員工',
    block: '封鎖',
};

export default function EmployeeList() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    const departments = useMemo(() => {
        return Array.from(
            new Set(
                employees
                    .map((employee) => employee.departmentName)
                    .filter(Boolean)
            )
        );
    }, [employees]);

    const statuses = useMemo(() => {
        return Array.from(
            new Set(
                employees
                    .map((employee) => employee.workStatus)
                    .filter(Boolean)
            )
        );
    }, [employees]);

    function getWorkStatusLabel(status) {
        return WORK_STATUS_LABELS[status] || status || '-';
    }

    function getRoleLabel(role) {
        return ROLE_LABELS[role] || role || '-';
    }

    const filteredEmployees = useMemo(() => {
        return employees.filter((employee) => {
            if (departmentFilter !== 'all' && employee.departmentName !== departmentFilter) {
                return false;
            }

            if (statusFilter !== 'all' && employee.workStatus !== statusFilter) {
                return false;
            }

            return true;
        });
    }, [departmentFilter, employees, statusFilter]);

    function handleExportEmployees() {
        const headers = ['員工姓名', '員編', '部門', '系統角色', '狀態', 'LINE 名稱'];
        const rows = filteredEmployees.map((employee) => [
            employee.employeeName || '-',
            employee.employeeNo || '-',
            employee.departmentName || '-',
            getRoleLabel(employee.role),
            getWorkStatusLabel(employee.workStatus),
            employee.lineName || '-',
        ]);

        const csvContent = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = 'employee-list.csv';
        link.click();
        window.URL.revokeObjectURL(url);
    }

    async function loadEmployees() {
        setLoading(true);
        try {
            const response = await getEmployeeList();

            if (response?.success === false) {
                throw new Error(response.error || '員工列表讀取失敗');
            }

            const nextEmployees = Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response)
                    ? response
                    : [];

            setEmployees(nextEmployees);
        } catch (error) {
            void Swal.fire({
                icon: 'error',
                title: '載入失敗',
                text: error instanceof Error ? error.message : '無法讀取員工資料',
            });
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadEmployees();
    }, []);

    const handleEditEmployee = (employee) => {
        navigate('/employeeForm', {
            state: {
                mode: 'edit',
                employee: {
                    ...employee,
                    employeeSeqNo: employee.seqNo,
                    accountSeqNo: employee.accountSeqNo,
                    name: employee.employeeName,
                    dept: employee.departmentName,
                    lineId: employee.lineName,
                    status: getWorkStatusLabel(employee.workStatus),
                },
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
                    onClick={() => {
                        console.log('[EmployeeList] navigate to /employeeForm');
                        navigate('/employeeForm');
                    }}
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
                    <div className="text-3xl font-bold text-slate-800">{employees.length}</div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-sm border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 overflow-x-auto">
                    <div className="flex gap-3">
                        <select
                            value={departmentFilter}
                            onChange={(event) => setDepartmentFilter(event.target.value)}
                            className="bg-white border border-slate-200 rounded-sm text-sm py-2 px-3 focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all text-slate-600"
                        >
                            <option value="all">所有部門</option>
                            {departments.map((department) => (
                                <option key={department} value={department}>{department}</option>
                            ))}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            className="bg-white border border-slate-200 rounded-sm text-sm py-2 px-3 focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none transition-all text-slate-600"
                        >
                            <option value="all">所有狀態</option>
                            {statuses.map((status) => (
                                <option key={status} value={status}>{getWorkStatusLabel(status)}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="button"
                        onClick={handleExportEmployees}
                        className="text-slate-400 hover:text-brand flex items-center text-sm font-medium transition-colors gap-1"
                    >
                        <Download className="w-4 h-4" />
                        匯出
                    </button>
                </div>

                <div className="overflow-x-auto overflow-y-hidden">
                    <table className="min-w-[980px] w-full text-left">
                        <thead>
                        <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-50/50">
                            <th className="sticky left-0 z-20 bg-slate-50/50 px-6 py-4 border-b border-slate-100">員工姓名</th>
                            <th className="px-6 py-4 border-b border-slate-100">員編</th>
                            <th className="px-6 py-4 border-b border-slate-100">部門</th>
                            <th className="px-6 py-4 border-b border-slate-100">系統角色</th>
                            <th className="px-6 py-4 border-b border-slate-100">狀態</th>
                            <th className="px-6 py-4 border-b border-slate-100">LINE 名稱</th>
                            <th className="px-6 py-4 border-b border-slate-100 text-center">編輯</th>
                        </tr>
                        </thead>
                        <tbody className="text-base text-slate-600 divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td className="px-6 py-10 text-center text-slate-400" colSpan={6}>載入中...</td>
                            </tr>
                        ) : filteredEmployees.length ? filteredEmployees.map((emp, index) => (
                            <tr
                                key={emp.employeeNo || emp.employeeName || index}
                                onClick={() => handleEditEmployee(emp)}
                                className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                            >
                                <td className="sticky left-0 z-10 bg-white px-6 py-4 font-semibold text-slate-800 group-hover:bg-slate-50/50">{emp.employeeName || '-'}</td>
                                <td className="px-6 py-4 text-slate-500 font-mono text-sm">{emp.employeeNo || '-'}</td>
                                <td className="px-6 py-4">{emp.departmentName || '-'}</td>
                                <td className="px-6 py-4">
                    <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-bold tracking-wide inline-block",
                        emp.role === 'admin' ? 'bg-brand/10 text-brand' :
                        emp.role === 'manager' ? 'bg-slate-100 text-slate-600' :
                        emp.role === 'block' ? 'bg-red-50 text-red-500' :
                        'bg-slate-50 text-slate-400'
                    )}>
                      {getRoleLabel(emp.role)}
                    </span>
                                </td>
                                <td className="px-6 py-4">
                    <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-bold tracking-wide inline-block",
                        emp.workStatus === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {getWorkStatusLabel(emp.workStatus)}
                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-400">{emp.lineName || '-'}</td>
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
                        )) : (
                            <tr>
                                <td className="px-6 py-10 text-center text-slate-400" colSpan={6}>查無員工資料</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-400">
                        顯示 1 到 {filteredEmployees.length} 筆，共 {filteredEmployees.length} 筆資料
                    </p>
                    <div className="flex items-center space-x-1">
                        <button type="button" disabled className="w-8 h-8 flex items-center justify-center text-slate-300 rounded-sm">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center bg-brand text-white text-xs font-semibold rounded-sm">1</button>
                        <button type="button" disabled className="w-8 h-8 flex items-center justify-center text-slate-300 rounded-sm">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </Layout>
    )
}
