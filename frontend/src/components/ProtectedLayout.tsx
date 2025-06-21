import React from 'react';
import NavBar from './NavBar';
import { Outlet } from 'react-router-dom';

const ProtectedLayout: React.FC = () => {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
};

export default ProtectedLayout;