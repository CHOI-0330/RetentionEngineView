import React, { useState } from 'react';
import { UserRoleSelector } from './components/UserRoleSelector';
import { StudentInterface } from './components/StudentInterface';
import { MentorInterface } from './components/MentorInterface';

type UserRole = 'student' | 'mentor' | null;

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>(null);

  const handleRoleSelect = (role: 'student' | 'mentor') => {
    setUserRole(role);
  };

  const handleLogout = () => {
    setUserRole(null);
  };

  // Role selection screen
  if (!userRole) {
    return (
      <div key="role-selector">
        <UserRoleSelector onRoleSelect={handleRoleSelect} />
      </div>
    );
  }

  // Student interface
  if (userRole === 'student') {
    return (
      <div key="student-interface">
        <StudentInterface onLogout={handleLogout} />
      </div>
    );
  }

  // Mentor interface
  return (
    <div key="mentor-interface">
      <MentorInterface onLogout={handleLogout} />
    </div>
  );
}