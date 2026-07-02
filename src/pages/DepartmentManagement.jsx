import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Building, User, Users, ChevronDown, ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';
import Layout from '../components/Layout';
import { Button } from '../components/Button';
import { cn } from '../data/utils';
import {
  createDepartment,
  deleteDepartment,
  getDepartmentDetail,
  getDepartmentList,
  getEmployeeList,
  updateDepartment,
} from '../lib/cfctApi';

const EMPTY_FORM = {
  departmentNo: '',
  departmentName: '',
  parentDeptNo: '',
  managerEmpNo: '',
  sort: '0',
  remark: '',
};

function buildDepartmentTree(items, parentDeptNo = null) {
  return items
    .filter((item) => (item.parentDeptNo || null) === parentDeptNo)
    .map((item) => ({
      ...item,
      children: buildDepartmentTree(items, item.departmentNo),
    }));
}

function collectExpandedIds(items) {
  return items
    .filter((item) => item.children?.length)
    .map((item) => item.departmentNo);
}

function DepartmentTreeNode({ node, expandedIds, selectedId, onToggle, onSelect, level = 0 }) {
  const hasChildren = Boolean(node.children?.length);
  const isExpanded = expandedIds.includes(node.departmentNo);
  const isSelected = selectedId === node.seqNo;

  return (
    <div className="space-y-1">
      <div
        className={cn(
          'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left transition-colors',
          isSelected ? 'bg-brand/10 text-brand' : 'text-slate-600 hover:bg-slate-50'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <span className="flex w-4 shrink-0 justify-center">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggle(node.departmentNo)}
              className="text-slate-400 hover:text-slate-600"
              aria-label={isExpanded ? `收合 ${node.departmentName}` : `展開 ${node.departmentName}`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="block h-px w-3 bg-slate-200" />
          )}
        </span>
        <button
          type="button"
          onClick={() => onSelect(node.seqNo)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <Building className={cn('h-4 w-4 shrink-0', isSelected ? 'text-brand' : 'text-slate-400')} />
          <span className={cn('truncate text-sm', isSelected ? 'font-bold' : 'font-medium')}>
            {node.departmentName}
          </span>
        </button>
      </div>

      {hasChildren && isExpanded ? (
        <div className="ml-4 space-y-1 border-l border-slate-100">
          {node.children.map((child) => (
            <DepartmentTreeNode
              key={child.seqNo}
              node={child}
              expandedIds={expandedIds}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createParentDeptNo, setCreateParentDeptNo] = useState('');
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const departmentTree = useMemo(() => buildDepartmentTree(departments), [departments]);

  const selectedDepartmentFromList = useMemo(() => {
    return departments.find((item) => item.seqNo === selectedId) ?? null;
  }, [departments, selectedId]);

  const memberList = useMemo(() => {
    if (!selectedDepartment) {
      return [];
    }

    return employees.filter((employee) => employee.departmentNo === selectedDepartment.departmentNo);
  }, [employees, selectedDepartment]);

  const managerOptions = useMemo(() => {
    return employees
      .filter((employee) => ['manager', 'admin'].includes(employee.role) && employee.employeeNo && employee.employeeName)
      .map((employee) => ({
        value: employee.employeeNo,
        label: employee.employeeName,
      }));
  }, [employees]);

  async function loadDepartments(preferredId = selectedId) {
    setLoading(true);
    try {
      console.log('[DepartmentManagement] GET /app-api/departments');
      console.log('[DepartmentManagement] GET /app-api/employees');
      const [departmentResponse, employeeResponse] = await Promise.all([
        getDepartmentList(),
        getEmployeeList(),
      ]);
      console.log('[DepartmentManagement] department list response', departmentResponse);
      console.log('[DepartmentManagement] employee list response', employeeResponse);

      if (departmentResponse?.success === false) {
        throw new Error(departmentResponse.error || '部門列表讀取失敗');
      }
      if (employeeResponse?.success === false) {
        throw new Error(employeeResponse.error || '員工列表讀取失敗');
      }

      const nextDepartments = Array.isArray(departmentResponse?.data) ? departmentResponse.data : [];
      const nextEmployees = Array.isArray(employeeResponse?.data) ? employeeResponse.data : [];

      setDepartments(nextDepartments);
      setEmployees(nextEmployees);
      setExpandedIds(collectExpandedIds(buildDepartmentTree(nextDepartments)));

      const nextSelected =
        nextDepartments.find((item) => item.seqNo === preferredId)?.seqNo ??
        nextDepartments[0]?.seqNo ??
        null;
      setSelectedId(nextSelected);
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: '讀取失敗',
        text: error instanceof Error ? error.message : '無法讀取部門資料',
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadDepartmentDetail(seqNo) {
    if (!seqNo) {
      setSelectedDepartment(null);
      return;
    }

    setDetailLoading(true);
    try {
      console.log('[DepartmentManagement] GET /app-api/departments/:seqNo', { seqNo });
      const response = await getDepartmentDetail(seqNo);
      console.log('[DepartmentManagement] department detail response', response);

      if (!response?.success || !response.data) {
        throw new Error(response?.error || '部門明細讀取失敗');
      }

      setSelectedDepartment(response.data);
      setEditForm({
        departmentNo: response.data.departmentNo || '',
        departmentName: response.data.departmentName || '',
        parentDeptNo: response.data.parentDeptNo || '',
        managerEmpNo: response.data.managerEmpNo || '',
        sort: String(response.data.sort ?? 0),
        remark: response.data.remark || '',
      });
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: '讀取失敗',
        text: error instanceof Error ? error.message : '無法讀取部門明細',
      });
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadDepartments();
  }, []);

  useEffect(() => {
    if (selectedId) {
      void loadDepartmentDetail(selectedId);
    }
  }, [selectedId]);

  function toggleNode(departmentNo) {
    setExpandedIds((current) =>
      current.includes(departmentNo)
        ? current.filter((item) => item !== departmentNo)
        : [...current, departmentNo]
    );
  }

  function openCreateModal(parentDeptNo = '') {
    console.log('[DepartmentManagement] open create modal', { parentDeptNo });
    setCreateParentDeptNo(parentDeptNo);
    setCreateForm({
      ...EMPTY_FORM,
      parentDeptNo,
    });
    setShowCreateModal(true);
  }

  async function handleCreateDepartment() {
    if (!createForm.departmentNo.trim() || !createForm.departmentName.trim()) {
      void Swal.fire({
        icon: 'warning',
        title: '請填寫必填欄位',
        text: '部門編號與部門名稱為必填。',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        departmentNo: createForm.departmentNo.trim(),
        departmentName: createForm.departmentName.trim(),
        parentDeptNo: createForm.parentDeptNo || null,
        managerEmpNo: createForm.managerEmpNo || null,
        sort: Number(createForm.sort || 0),
        remark: createForm.remark.trim() || null,
      };

      console.log('[DepartmentManagement] POST /app-api/departments', { body: payload });
      const response = await createDepartment(payload);
      console.log('[DepartmentManagement] create department response', response);

      if (!response?.success) {
        throw new Error(response?.error || '建立部門失敗');
      }

      setShowCreateModal(false);
      await loadDepartments(response?.data?.seqNo ?? null);
      void Swal.fire({
        icon: 'success',
        title: '部門已建立',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: '建立失敗',
        text: error instanceof Error ? error.message : '無法建立部門',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDepartment() {
    if (!selectedDepartment) {
      return;
    }

    if (!editForm.departmentName.trim()) {
      void Swal.fire({
        icon: 'warning',
        title: '請填寫部門名稱',
        text: '部門名稱為必填。',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        departmentName: editForm.departmentName.trim(),
        parentDeptNo: editForm.parentDeptNo || null,
        managerEmpNo: editForm.managerEmpNo || null,
        sort: Number(editForm.sort || 0),
        remark: editForm.remark.trim() || null,
        rowVer: selectedDepartment.rowVer,
      };

      console.log('[DepartmentManagement] PATCH /app-api/departments/:seqNo', {
        seqNo: selectedDepartment.seqNo,
        body: payload,
      });
      const response = await updateDepartment(selectedDepartment.seqNo, payload);
      console.log('[DepartmentManagement] update department response', response);

      if (!response?.success) {
        throw new Error(response?.error || '更新部門失敗');
      }

      await loadDepartments(selectedDepartment.seqNo);
      await loadDepartmentDetail(selectedDepartment.seqNo);
      void Swal.fire({
        icon: 'success',
        title: '部門已更新',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: '更新失敗',
        text: error instanceof Error ? error.message : '無法更新部門',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDepartment() {
    if (!selectedDepartment) {
      return;
    }

    const result = await Swal.fire({
      icon: 'warning',
      title: `刪除部門 ${selectedDepartment.departmentName}`,
      text: '這會做軟刪除，之後列表不再顯示。',
      showCancelButton: true,
      confirmButtonText: '確認刪除',
      cancelButtonText: '取消',
      confirmButtonColor: '#ba1a1a',
    });

    if (!result.isConfirmed) {
      return;
    }

    setSaving(true);
    try {
      const payload = { rowVer: selectedDepartment.rowVer };
      console.log('[DepartmentManagement] DELETE /app-api/departments/:seqNo', {
        seqNo: selectedDepartment.seqNo,
        body: payload,
      });
      const response = await deleteDepartment(selectedDepartment.seqNo, payload);
      console.log('[DepartmentManagement] delete department response', response);

      if (!response?.success) {
        throw new Error(response?.error || '刪除部門失敗');
      }

      await loadDepartments();
      void Swal.fire({
        icon: 'success',
        title: '部門已刪除',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      void Swal.fire({
        icon: 'error',
        title: '刪除失敗',
        text: error instanceof Error ? error.message : '無法刪除部門',
      });
    } finally {
      setSaving(false);
    }
  }

  function handleCancelDepartment() {
    if (!selectedDepartment) {
      return;
    }

    setEditForm({
      departmentNo: selectedDepartment.departmentNo || '',
      departmentName: selectedDepartment.departmentName || '',
      parentDeptNo: selectedDepartment.parentDeptNo || '',
      managerEmpNo: selectedDepartment.managerEmpNo || '',
      sort: String(selectedDepartment.sort ?? 0),
      remark: selectedDepartment.remark || '',
    });
  }

  return (
    <Layout title="部門管理">
      <div className="space-y-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">部門組織架構</h2>
        </div>

        <div className="flex h-full flex-col items-start gap-6 pb-20 lg:flex-row">
          <div className="flex w-full shrink-0 flex-col rounded-sm border border-slate-200 bg-white shadow-sm lg:w-80">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <span className="font-semibold text-slate-700">部門列表</span>
              <button
                type="button"
                onClick={() => openCreateModal(selectedDepartment?.departmentNo || '')}
                className="flex h-8 w-8 items-center justify-center rounded-sm bg-brand text-white transition-colors hover:bg-brand/90"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1 p-4">
              {loading ? (
                <div className="text-sm text-slate-400">讀取中...</div>
              ) : departmentTree.length ? (
                departmentTree.map((node) => (
                  <DepartmentTreeNode
                    key={node.seqNo}
                    node={node}
                    expandedIds={expandedIds}
                    selectedId={selectedId}
                    onToggle={toggleNode}
                    onSelect={setSelectedId}
                  />
                ))
              ) : (
                <div className="text-sm text-slate-400">查無部門資料</div>
              )}
            </div>
          </div>

          <div className="w-full flex-1 space-y-6">
            <div className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
              <div className="h-1.5 w-full bg-primary" />
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {selectedDepartment?.departmentName || selectedDepartmentFromList?.departmentName || '-'}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <User className="h-4 w-4" />
                        <span>負責人：{selectedDepartment?.managerName || selectedDepartmentFromList?.managerName || '未設定主管'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Users className="h-4 w-4" />
                        <span>部門人數：{selectedDepartment?.memberCount ?? selectedDepartmentFromList?.memberCount ?? 0} 人</span>
                      </div>
                    </div>
                  </div>
                </div>
                {selectedDepartment ? (
                  <button
                    type="button"
                    onClick={() => openCreateModal(selectedDepartment.departmentNo)}
                    className="text-sm font-bold text-primary transition-colors hover:text-primary-container"
                  >
                    新增子部門
                  </button>
                ) : null}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
              <div className="h-1.5 w-full bg-primary" />
              <div className="p-8">
                <div className="mb-8 flex flex-col items-start gap-4 border-b border-outline-variant pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="text-primary" size={20} />
                    <h2 className="text-lg font-bold text-primary">部門資料設定</h2>
                  </div>
                  {selectedDepartment ? (
                    <button
                      type="button"
                      onClick={() => void handleDeleteDepartment()}
                      className="inline-flex items-center gap-2 text-sm font-bold text-red-500 transition-colors hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      刪除部門
                    </button>
                  ) : null}
                </div>

                {detailLoading || loading ? (
                  <div className="text-sm text-slate-400">讀取部門資料中...</div>
                ) : !selectedDepartment ? (
                  <div className="text-sm text-slate-400">請先選擇部門</div>
                ) : (
                  <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
                    <ReadonlyField label="部門編號" value={editForm.departmentNo || '-'} />

                    <FormInput
                      label="部門名稱"
                      value={editForm.departmentName}
                      onChange={(value) => setEditForm((current) => ({ ...current, departmentName: value }))}
                    />

                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant" htmlFor="dept-head">
                        部門主管
                      </label>
                      <div className="relative">
                        <select
                          id="dept-head"
                          value={editForm.managerEmpNo}
                          onChange={(event) => setEditForm((current) => ({ ...current, managerEmpNo: event.target.value }))}
                          className="h-11 w-full appearance-none rounded-lg border border-outline bg-white px-4 text-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">未設定主管</option>
                          {managerOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <FormInput
                      label="排序"
                      type="number"
                      value={editForm.sort}
                      onChange={(value) => setEditForm((current) => ({ ...current, sort: value }))}
                    />

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant" htmlFor="parent-dept">
                        上級部門
                      </label>
                      <div className="relative">
                        <select
                          id="parent-dept"
                          value={editForm.parentDeptNo}
                          onChange={(event) => setEditForm((current) => ({ ...current, parentDeptNo: event.target.value }))}
                          className="h-11 w-full appearance-none rounded-lg border border-outline bg-white px-4 text-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">無</option>
                          {departments
                            .filter((item) => item.departmentNo !== editForm.departmentNo)
                            .map((item) => (
                              <option key={item.departmentNo} value={item.departmentNo}>{item.departmentName}</option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
                        部門成員
                      </label>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {memberList.length ? (
                          memberList.map((member) => (
                            <div key={member.seqNo} className="rounded-lg bg-surface-container-low px-4 py-3 text-sm">
                              <div className="font-medium text-on-surface">{member.employeeName}</div>
                              <div className="mt-1 text-xs text-on-surface-variant">{member.employeeNo}</div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-lg bg-surface-container px-4 py-3 text-sm text-on-surface-variant md:col-span-2 xl:col-span-3">
                            此部門目前沒有員工
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-outline-variant bg-surface-container-low px-8 py-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={handleCancelDepartment} className="px-6" disabled={!selectedDepartment || saving}>
                  取消修改
                </Button>
                <Button onClick={() => void handleSaveDepartment()} className="bg-primary px-8 font-bold hover:bg-primary/90" disabled={!selectedDepartment || saving}>
                  儲存修改
                </Button>
              </div>
            </div>
          </div>
        </div>

        {showCreateModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">新增部門</h2>
                  <p className="mt-0.5 text-sm text-slate-400">建立新部門並設定上級部門與主管</p>
                </div>
              </div>

              <div className="space-y-6 p-6">
                <FormInput
                  label="部門編號 *"
                  value={createForm.departmentNo}
                  onChange={(value) => setCreateForm((current) => ({ ...current, departmentNo: value }))}
                />
                <FormInput
                  label="部門名稱 *"
                  value={createForm.departmentName}
                  onChange={(value) => setCreateForm((current) => ({ ...current, departmentName: value }))}
                />

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant" htmlFor="create-manager">
                    部門主管
                  </label>
                  <div className="relative">
                    <select
                      id="create-manager"
                      value={createForm.managerEmpNo}
                      onChange={(event) => setCreateForm((current) => ({ ...current, managerEmpNo: event.target.value }))}
                      className="h-11 w-full appearance-none rounded-lg border border-outline bg-white px-4 text-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">未設定主管</option>
                      {managerOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant" htmlFor="create-parent">
                    上級部門
                  </label>
                  <div className="relative">
                    <select
                      id="create-parent"
                      value={createForm.parentDeptNo}
                      onChange={(event) => setCreateForm((current) => ({ ...current, parentDeptNo: event.target.value }))}
                      className="h-11 w-full appearance-none rounded-lg border border-outline bg-white px-4 text-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">無</option>
                      {departments.map((item) => (
                        <option key={item.departmentNo} value={item.departmentNo}>{item.departmentName}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <FormInput
                  label="排序"
                  type="number"
                  value={createForm.sort}
                  onChange={(value) => setCreateForm((current) => ({ ...current, sort: value }))}
                />
              </div>

              <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 px-6 py-4">
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={saving}>取消</Button>
                  <Button onClick={() => void handleCreateDepartment()} className="bg-primary text-white hover:bg-primary/90" disabled={saving}>
                    儲存變更
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}

function ReadonlyField({ label, value }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
        {label}
      </label>
      <div className="flex h-11 w-full items-center rounded-lg border border-outline bg-surface-container-low px-4 text-sm text-on-surface">
        {value}
      </div>
    </div>
  );
}

function FormInput({ label, onChange, ...props }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant">
        {label}
      </label>
      <input
        {...props}
        className="h-11 w-full rounded-lg border border-outline bg-white px-4 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
