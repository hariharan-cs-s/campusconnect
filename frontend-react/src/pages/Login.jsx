import { useState } from 'react';
import API from '../api';

function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const { data } = await API.post('/auth/login', { email: formData.email, password: formData.password });
        onLogin(data);
      } else {
        await API.post('/auth/signup', formData);
        const { data } = await API.post('/auth/login', { email: formData.email, password: formData.password });
        onLogin(data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container glass" style={{ padding: '2rem' }}>
      <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
      {error && <div className="toast error" style={{ position: 'relative', margin: '1rem 0', right: 0, bottom: 0, animation: 'none' }}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="form-group">
            <label>Name</label>
            <input required type="text" onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
        )}
        <div className="form-group">
          <label>Email</label>
          <input required type="email" onChange={(e) => setFormData({...formData, email: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input required type="password" onChange={(e) => setFormData({...formData, password: e.target.value})} />
        </div>
        {!isLogin && (
          <div className="form-group">
            <label>Role</label>
            <select onChange={(e) => setFormData({...formData, role: e.target.value})} value={formData.role}>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}
        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
          {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
        </button>
      </form>
      
      <p className="auth-switch">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <span onClick={() => setIsLogin(!isLogin)}>{isLogin ? 'Sign up' : 'Login'}</span>
      </p>
    </div>
  );
}

export default Login;
