import { Plus, Trash2, Building, User, Users, ChevronDown, ChevronRight, X } from "lucide-react"
import Swal from "sweetalert2"
import { Button } from "../components/Button"
import { Input, Label } from "../components/Input"
import { useState } from "react"
import { cn } from '../data/utils';
import Layout from '../components/Layout';

const initialTree = [
    {
        id: "root",
        name: "總經理室",
        icon: Building,
        head: "王小明 (Executive Director)",
        memberCount: 1,
        members: ["王小明"],
        parentId: null,
        parentLabel: "無",
        children: [
            {
                id: "admin",
                name: "行政 管理部",
                icon: Building,
                head: "林威廉 (William Lin)",
                memberCount: 12,
                members: ["張小華", "林宜靜", "陳志豪"],
                parentId: "root",
                parentLabel: "總經理室 (Root)",
                children: [
                    {
                        id: "hr",
                        name: "人力資源課",
                        icon: Building,
                        head: "陳淑芬",
                        memberCount: 4,
                        members: ["陳淑芬", "黃美玲", "吳佩珊"],
                        parentId: "admin",
                        parentLabel: "行政管理部"
                    },
                    {
                        id: "ga",
                        name: "總務行政課",
                        icon: Building,
                        head: "李建宏",
                        memberCount: 3,
                        members: ["李建宏", "曾雅婷", "何志明"],
                        parentId: "admin",
                        parentLabel: "行政管理部"
                    },
                ]
            },
            {
                id: "rd",
                name: "技術研發部",
                icon: Building,
                head: "周志豪",
                memberCount: 18,
                members: ["周志豪", "郭俊廷", "高品妤"],
                parentId: "root",
                parentLabel: "總經理室 (Root)"
            },
            {
                id: "mkt",
                name: "市場行銷部",
                icon: Building,
                head: "吳佳玲",
                memberCount: 9,
                members: ["吳佳玲", "陳宥蓁", "劉志成"],
                parentId: "root",
                parentLabel: "總經理室 (Root)"
            },
            {
                id: "fin",
                name: "財務會計部",
                icon: Building,
                head: "許文婷",
                memberCount: 6,
                members: ["許文婷", "林美君", "謝承宇"],
                parentId: "root",
                parentLabel: "總經理室 (Root)"
            },
        ]
    }
]

const employeeDirectory = [
    { id: "emp-001", name: "王小明", dept: "總經理室" },
    { id: "emp-002", name: "林威廉", dept: "行政管理部" },
    { id: "emp-003", name: "張小華", dept: "行政管理部" },
    { id: "emp-004", name: "林宜靜", dept: "行政管理部" },
    { id: "emp-005", name: "陳志豪", dept: "行政管理部" },
    { id: "emp-006", name: "陳淑芬", dept: "人力資源課" },
    { id: "emp-007", name: "黃美玲", dept: "人力資源課" },
    { id: "emp-008", name: "李建宏", dept: "總務行政課" },
    { id: "emp-009", name: "周志豪", dept: "技術研發部" },
    { id: "emp-010", name: "郭俊廷", dept: "技術研發部" },
    { id: "emp-011", name: "吳佳玲", dept: "市場行銷部" },
    { id: "emp-012", name: "許文婷", dept: "財務會計部" },
];

function flattenTree(nodes) {
    return nodes.flatMap((node) => [node, ...(node.children ? flattenTree(node.children) : [])]);
}

function findNodeById(nodes, nodeId) {
    for (const node of nodes) {
        if (node.id === nodeId) {
            return node;
        }

        if (node.children?.length) {
            const childMatch = findNodeById(node.children, nodeId);
            if (childMatch) {
                return childMatch;
            }
        }
    }

    return null;
}

function addChildDepartment(nodes, parentId, childNode) {
    return nodes.map((node) => {
        if (node.id === parentId) {
            return {
                ...node,
                children: [...(node.children ?? []), childNode],
            };
        }

        if (node.children?.length) {
            return {
                ...node,
                children: addChildDepartment(node.children, parentId, childNode),
            };
        }

        return node;
    });
}

function deleteDepartmentById(nodes, nodeId) {
    return nodes
        .filter((node) => node.id !== nodeId)
        .map((node) => ({
            ...node,
            children: node.children?.length ? deleteDepartmentById(node.children, nodeId) : node.children,
        }));
}

function updateDepartmentById(nodes, nodeId, updater) {
    return nodes.map((node) => {
        if (node.id === nodeId) {
            return updater(node);
        }

        if (node.children?.length) {
            return {
                ...node,
                children: updateDepartmentById(node.children, nodeId, updater),
            };
        }

        return node;
    });
}

function DepartmentTreeNode({ node, level = 0, expandedIds, selectedId, onToggle, onSelect, onContextMenu }) {
    const Icon = node.icon ?? Building;
    const hasChildren = Boolean(node.children?.length);
    const isExpanded = expandedIds.includes(node.id);
    const isSelected = selectedId === node.id;

    return (
        <div className="space-y-1">
            <div
                onContextMenu={(event) => onContextMenu(event, node)}
                className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left transition-colors",
                    isSelected ? "bg-brand/10 text-brand" : "text-slate-600 hover:bg-slate-50"
                )}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
            >
                <span className="flex w-4 justify-center shrink-0">
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onToggle(node.id);
                            }}
                            className="text-slate-400 hover:text-slate-600"
                            aria-label={isExpanded ? `收合 ${node.name}` : `展開 ${node.name}`}
                        >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    ) : (
                        <span className="block w-3 h-px bg-slate-200" />
                    )}
                </span>
                <button
                    type="button"
                    onClick={() => onSelect(node.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                    <Icon className={cn("w-4 h-4 shrink-0", isSelected ? "text-brand" : "text-slate-400")} />
                    <span className={cn("text-sm truncate", isSelected ? "font-bold" : "font-medium")}>{node.name}</span>
                </button>
            </div>

            {hasChildren && isExpanded ? (
                <div className="space-y-1 border-l border-slate-100 ml-4">
                    {node.children.map((child) => (
                        <DepartmentTreeNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            expandedIds={expandedIds}
                            selectedId={selectedId}
                            onToggle={onToggle}
                            onSelect={onSelect}
                            onContextMenu={onContextMenu}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export default function DepartmentManagement() {
    const [departmentTree, setDepartmentTree] = useState(initialTree)
    const [showModal, setShowModal] = useState(false)
    const [showMemberDialog, setShowMemberDialog] = useState(false)
    const [pendingMembers, setPendingMembers] = useState([])
    const [expandedIds, setExpandedIds] = useState(["root", "admin"])
    const [selectedId, setSelectedId] = useState("admin")
    const [contextMenu, setContextMenu] = useState(null)
    const [modalMode, setModalMode] = useState("add")
    const [targetDepartmentId, setTargetDepartmentId] = useState("root")
    const [departmentNameInput, setDepartmentNameInput] = useState("")
    const departments = flattenTree(departmentTree);
    const selectedDepartment = departments.find((department) => department.id === selectedId) ?? departmentTree[0];
    const targetDepartment = findNodeById(departmentTree, targetDepartmentId) ?? departmentTree[0];

    const toggleNode = (nodeId) => {
        setExpandedIds((current) =>
            current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId]
        );
    };

    const openAddDepartmentModal = (parentId) => {
        setModalMode("add");
        setTargetDepartmentId(parentId);
        setDepartmentNameInput("");
        setShowModal(true);
        setContextMenu(null);
    };

    const handleTreeContextMenu = (event, node) => {
        event.preventDefault();
        setSelectedId(node.id);
        setContextMenu({
            nodeId: node.id,
            x: event.clientX,
            y: event.clientY,
        });
    };

    const handleDeleteDepartment = (nodeId) => {
        if (nodeId === "root") {
            setContextMenu(null);
            return;
        }

        const targetNode = findNodeById(departmentTree, nodeId);
        if (!targetNode || !window.confirm(`確定刪除部門「${targetNode.name}」？`)) {
            setContextMenu(null);
            return;
        }

        const nextTree = deleteDepartmentById(departmentTree, nodeId);
        const nextDepartments = flattenTree(nextTree);

        setDepartmentTree(nextTree);
        setExpandedIds((current) => current.filter((id) => id !== nodeId && nextDepartments.some((department) => department.id === id)));
        setSelectedId(nextDepartments.some((department) => department.id === selectedId) ? selectedId : (targetNode.parentId ?? "root"));
        setContextMenu(null);
        setShowModal(false);
    };

    const handleCreateDepartment = () => {
        const trimmedName = departmentNameInput.trim();
        if (!trimmedName) {
            return;
        }

        const parentNode = findNodeById(departmentTree, targetDepartmentId);
        if (!parentNode) {
            return;
        }

        const newNode = {
            id: `dept-${Date.now()}`,
            name: trimmedName,
            icon: Building,
            head: "未設定主管",
            memberCount: 0,
            members: [],
            parentLabel: `${parentNode.name}${parentNode.id === "root" ? " (Root)" : ""}`,
            parentId: parentNode.id,
        };

        setDepartmentTree((current) => addChildDepartment(current, parentNode.id, newNode));
        setExpandedIds((current) => current.includes(parentNode.id) ? current : [...current, parentNode.id]);
        setSelectedId(newNode.id);
        setShowModal(false);
        setDepartmentNameInput("");
    };

    const handleAddMember = (employeeName) => {
        setPendingMembers((current) => {
            if (current.includes(employeeName)) {
                return current;
            }

            return [...current, employeeName];
        });
    };

    const openMemberDialog = () => {
        setPendingMembers(selectedDepartment.members ?? []);
        setShowMemberDialog(true);
    };

    const handleConfirmMembers = () => {
        setDepartmentTree((current) => updateDepartmentById(current, selectedDepartment.id, (department) => {
            return {
                ...department,
                members: pendingMembers,
                memberCount: pendingMembers.length,
            };
        }));
        setShowMemberDialog(false);
    };

    const handleCloseMemberDialog = () => {
        setShowMemberDialog(false);
        setPendingMembers([]);
    };

    const handleToggleMember = (employeeName) => {
        if (pendingMembers.includes(employeeName)) {
            setPendingMembers((current) => current.filter((member) => member !== employeeName));
            return;
        }

        handleAddMember(employeeName);
    };

    const handleRemoveMember = (employeeName) => {
        setDepartmentTree((current) => updateDepartmentById(current, selectedDepartment.id, (department) => {
            const nextMembers = (department.members ?? []).filter((member) => member !== employeeName);

            return {
                ...department,
                members: nextMembers,
                memberCount: nextMembers.length,
            };
        }));
    };

    const handleSaveDepartment = () => {
        void Swal.fire({
            icon: "success",
            title: "儲存成功",
            showConfirmButton: false,
            timer: 1000,
        });
    };

    const handleCancelDepartment = () => {
        void Swal.fire({
            icon: "success",
            title: "已取消修改",
            showConfirmButton: false,
            timer: 1000,
        });
    };

    return (
        <Layout title="部門管理">
        <div className="space-y-6">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800">部門組織架構</h2>
                <p className="text-slate-500 text-sm mt-1">管理公司部門層級、負責人及簽核流程配置</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start h-full pb-20">
                {/* Department Tree Sidebar */}
                <div className="w-full lg:w-80 bg-white rounded-sm border border-slate-200 shadow-sm flex flex-col shrink-0">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <span className="font-semibold text-slate-700">部門列表</span>
                        <button
                            onClick={() => openAddDepartmentModal(selectedId)}
                            className="w-8 h-8 bg-brand text-white rounded-sm flex items-center justify-center hover:bg-brand/90 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <div
                        className="p-4 space-y-1"
                        onClick={() => contextMenu ? setContextMenu(null) : null}
                    >
                        {departmentTree.map((node) => (
                            <DepartmentTreeNode
                                key={node.id}
                                node={node}
                                expandedIds={expandedIds}
                                selectedId={selectedId}
                                onToggle={toggleNode}
                                onSelect={setSelectedId}
                                onContextMenu={handleTreeContextMenu}
                            />
                        ))}
                    </div>
                </div>

                {/* Department Detail Section */}
                <div className="flex-1 space-y-6 w-full">
                    {/* Summary Card */}
                    <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                        <div className="h-1.5 bg-primary w-full"></div>
                        <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                <Building className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{selectedDepartment.name}</h3>
                                <div className="flex flex-wrap items-center gap-4 mt-1">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <User className="w-4 h-4" />
                                        <span>負責人：{selectedDepartment.head ?? "-"}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <Users className="w-4 h-4" />
                                        <span>部門人數：{selectedDepartment.memberCount ?? 0} 人</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>

                    {/* Form Area */}
                    <div key={selectedDepartment.id} className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                        <div className="h-1.5 bg-primary w-full"></div>
                        <div className="p-8">
                            <div className="mb-8 flex flex-col items-start gap-4 border-b border-outline-variant pb-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2">
                                    <Building className="text-primary" size={20} />
                                    <h2 className="text-lg font-bold text-primary">部門資料設定</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={openMemberDialog}
                                    className="text-sm font-bold text-primary transition-colors hover:text-primary-container"
                                >
                                    新增成員
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">


                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant" htmlFor="dept-head">
                                        部門主管
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="dept-head"
                                            className="w-full h-11 appearance-none rounded-lg border border-outline bg-white px-4 text-sm text-on-surface outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        >
                                            <option>{selectedDepartment.head ?? "未設定主管"}</option>
                                            <option>陳大文</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                                        部門成員
                                    </label>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {(selectedDepartment.members ?? []).map(name => (
                                            <div key={name} className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3 text-sm">
                                                <div className="flex min-w-0 items-center">
                                                    <span className="truncate font-medium text-on-surface">{name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveMember(name)}
                                                    className="text-slate-300 transition-colors hover:text-red-500"
                                                    aria-label={`移除 ${name}`}
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {selectedDepartment.memberCount > (selectedDepartment.members?.length ?? 0) ? (
                                            <div className="flex items-center rounded-lg bg-surface-container px-4 py-3 text-sm italic text-on-surface-variant">
                                                +{selectedDepartment.memberCount - (selectedDepartment.members?.length ?? 0)} 更多成員
                                            </div>
                                        ) : null}
                                        {(selectedDepartment.members?.length ?? 0) === 0 ? (
                                            <div className="rounded-lg bg-surface-container px-4 py-3 text-sm text-on-surface-variant md:col-span-2 xl:col-span-3">
                                                尚未加入部門成員
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant" htmlFor="parent-dept">
                                        層級設定 (上級部門)
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="parent-dept"
                                            className="w-full h-11 appearance-none rounded-lg border border-outline bg-white px-4 text-sm text-on-surface outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        >
                                            <option>{selectedDepartment.parentLabel ?? "無"}</option>
                                            <option>技術研發部</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-container-low px-8 py-4 flex flex-col gap-3 border-t border-outline-variant sm:flex-row sm:justify-end">
                            <Button variant="outline" onClick={handleCancelDepartment} className="px-6">取消修改</Button>

                            <Button onClick={handleSaveDepartment} className="px-8 font-bold bg-primary hover:bg-primary/90">儲存修改</Button>
                        </div>
                    </div>
                </div>
            </div>

            {contextMenu ? (
                <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)}>
                    <div
                        className="absolute min-w-40 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => openAddDepartmentModal(contextMenu.nodeId)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                            <Plus className="w-4 h-4" />
                            新增子部門
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDeleteDepartment(contextMenu.nodeId)}
                            disabled={contextMenu.nodeId === "root"}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
                        >
                            <Trash2 className="w-4 h-4" />
                            刪除部門
                        </button>
                    </div>
                </div>
            ) : null}

            {showMemberDialog ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">新增部門成員</h2>
                                <p className="mt-0.5 text-sm text-slate-400">從所有員工中選擇加入 {selectedDepartment.name}</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseMemberDialog}
                                className="p-1 text-slate-300 transition-colors hover:text-slate-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="max-h-[420px] space-y-2 overflow-y-auto p-6">
                            {employeeDirectory.map((employee) => {
                                const isMember = pendingMembers.includes(employee.name);

                                return (
                                    <div
                                        key={employee.id}
                                        className="flex items-center justify-between rounded-sm border border-slate-100 px-4 py-3"
                                    >
                                        <div>
                                            <div className="text-sm font-semibold text-slate-800">{employee.name}</div>
                                            <div className="text-xs text-slate-400">{employee.dept}</div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant={isMember ? "outline" : "primary"}
                                            onClick={() => handleToggleMember(employee.name)}
                                            className={cn("min-w-20", isMember ? "border-red-200 text-red-500 hover:bg-red-50" : "text-primary")}
                                        >
                                            {isMember ? "移除" : "加入"}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                            <Button variant="outline" onClick={handleCloseMemberDialog}>取消</Button>
                            <Button onClick={handleConfirmMembers} className="text-primary">確認新增</Button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* New Department Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{modalMode === "add" ? "新增部門" : "編輯部門"}</h2>
                                <p className="text-sm text-slate-400 mt-0.5">
                                    {modalMode === "add" ? `將新部門新增到 ${targetDepartment?.name ?? "未指定部門"} 底下` : "修改部門資訊"}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-300 hover:text-slate-600 transition-colors p-1"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-1">
                                <Label>部門名稱</Label>
                                <Input
                                    placeholder="請輸入部門名稱"
                                    value={departmentNameInput}
                                    onChange={(event) => setDepartmentNameInput(event.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>部門主管</Label>
                                <div className="relative">
                                    <select className="w-full h-10 border-slate-200 rounded-sm focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all text-slate-700 bg-white px-3 appearance-none">
                                        <option>王小明 (Executive Director)</option>
                                        <option>李大華 (Manager)</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label>層級設定 (上級部門)</Label>
                                <div className="relative">
                                    <div className="w-full h-10 rounded-sm border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 flex items-center">
                                        {targetDepartment?.name ?? "未指定部門"}
                                    </div>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setShowModal(false)}>取消</Button>
                                <Button onClick={handleCreateDepartment} className="bg-primary text-white hover:bg-primary/90">儲存變更</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </Layout>
    )
}
