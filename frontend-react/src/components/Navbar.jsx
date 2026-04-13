import { Link } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  return (
    <nav>
      <Link to="/" className="brand">CampusEvents</Link>
      <div className="links">
        <Link to="/">Events</Link>
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <span style={{color: 'var(--text-muted)'}}>| Hi, {user.name}</span>
            <button onClick={onLogout} className="btn" style={{background: 'transparent', border: '1px solid var(--border)', color: 'white'}}>Logout</button>
          </>
        ) : (
          <Link to="/login">
            <button className="btn btn-primary">Login</button>
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
