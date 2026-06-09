import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LeaveApplication from './pages/LeaveApplication';
import OvertimeApplication from './pages/OvertimeApplication';
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

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/apply-leave" element={<LeaveApplication />} />
        <Route path="/apply-overtime" element={<OvertimeApplication />} />
        <Route path="/records" element={<Records />} />
        <Route path="/view-application/:id" element={<ViewApplication />} />
        <Route path="/approvals" element={<ApprovalList/>} />
        <Route path="/managerDashboard" element={<ManagerDashboard/>} />
        <Route path="/departmentManagement" element={<DepartmentManagement/>} />
        <Route path="/employeeList" element={<EmployeeList/>} />
        <Route path="/employeeForm" element={<EmployeeForm />} />
        <Route path="/accountManagement" element={<AccountManagement />} />
        <Route path="/lineUserManagement" element={<LineUserManagement />} />
        <Route path="/approvals/detail" element={<ApprovalDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
