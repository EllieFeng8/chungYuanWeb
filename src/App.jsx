import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LeaveApplication from './pages/LeaveApplication';
import LeaveApplicationByLine from './pages/LeaveApplication_id';
import OvertimeApplication from './pages/OvertimeApplication';
import OvertimeApplicationByLine from './pages/OvertimeApplication_id';
import Records from './pages/Records';
import ViewApplication from './pages/ViewApplication';
import ApprovalList from './pages/ApprovalList';
import ApprovalDetail from './pages/ApprovalDetail';
import ManagerDashboard from './pages/ManagerDashboard';
import DepartmentManagement from './pages/DepartmentManagement';
import EmployeeForm from './pages/EmployeeForm';
import EmployeeList from './pages/EmployeeList';
import AccountManagement from './pages/AccountManagement';
import LineUserManagement from './pages/LineUserManagement';

const ROLE_STORAGE_KEY = 'userRole';
const ACCOUNT_SEQNO_STORAGE_KEY = 'loginAccountSeqNo';

function hasLoginSession() {
  if (typeof window === 'undefined') {
    return false;
  }

  const role = localStorage.getItem(ROLE_STORAGE_KEY) || sessionStorage.getItem(ROLE_STORAGE_KEY);
  const accountSeqNo =
    localStorage.getItem(ACCOUNT_SEQNO_STORAGE_KEY)
    || sessionStorage.getItem(ACCOUNT_SEQNO_STORAGE_KEY);

  return Boolean(role && accountSeqNo);
}

function ProtectedRoute({ children }) {
  return hasLoginSession() ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/apply-leave" element={<ProtectedRoute><LeaveApplication /></ProtectedRoute>} />
        <Route path="/apply-leave-id/:lineUserId" element={<LeaveApplicationByLine />} />
        <Route path="/apply-overtime" element={<ProtectedRoute><OvertimeApplication /></ProtectedRoute>} />
        <Route path="/apply-overtime-id/:lineUserId" element={<OvertimeApplicationByLine />} />
        <Route path="/records" element={<ProtectedRoute><Records /></ProtectedRoute>} />
        <Route path="/view-application/:id" element={<ProtectedRoute><ViewApplication /></ProtectedRoute>} />
        <Route path="/approvals" element={<ProtectedRoute><ApprovalList /></ProtectedRoute>} />
        <Route path="/managerDashboard" element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>} />
        <Route path="/departmentManagement" element={<ProtectedRoute><DepartmentManagement /></ProtectedRoute>} />
        <Route path="/employeeList" element={<ProtectedRoute><EmployeeList /></ProtectedRoute>} />
        <Route path="/employeeForm" element={<ProtectedRoute><EmployeeForm /></ProtectedRoute>} />
        <Route path="/accountManagement" element={<ProtectedRoute><AccountManagement /></ProtectedRoute>} />
        <Route path="/lineUserManagement" element={<ProtectedRoute><LineUserManagement /></ProtectedRoute>} />
        <Route path="/approvals/detail" element={<ProtectedRoute><ApprovalDetail /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
