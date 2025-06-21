import React from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

const NavBar: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiClient.post('accounts/logout/');
      navigate('/login');
    } catch (err) {
      console.error('Ошибка при выходе:', err);
    }
  };

  return (
    <Navbar bg="light" expand="lg">
      <Navbar.Brand as={Link} to="/dashboard">TimeSeries App</Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="me-auto">
          <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
          <Nav.Link as={Link} to="/timeseries-editor">Timeseries Editor</Nav.Link>
          <Nav.Link as={Link} to="/benchmark">Benchmark</Nav.Link>
          <Nav.Link as={Link} to="/benchmark-comparison">Benchmark Comparison</Nav.Link>
          <Nav.Link as={Link} to="/timeseries-list">Timeseries List</Nav.Link>
          <Nav.Link as={Link} to="/instructions">Instructions</Nav.Link>
        </Nav>
        <Nav>
          <Nav.Link onClick={handleLogout}>Logout</Nav.Link>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default NavBar;