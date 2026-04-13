import { useState, useEffect } from 'react';
import API from '../api';

function Dashboard({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', department: '', event_date: '', deadline: '', max_participants: ''
  });
  const [participants, setParticipants] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user.role]);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (user.role === 'admin') {
        const res = await API.get('/events');
        setData(res.data);
      } else {
        const res = await API.get('/users/me/registrations');
        setData(res.data);
      }
    } catch (err) {
      showToast('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await API.post('/events', formData);
      showToast('Event created successfully', 'success');
      setShowEventForm(false);
      fetchDashboardData();
    } catch (err) {
      showToast('Failed to create event', 'error');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await API.delete(`/events/${id}`);
      showToast('Event deleted', 'success');
      fetchDashboardData();
    } catch (err) {
      showToast('Failed to delete event', 'error');
    }
  };

  const viewParticipants = async (id) => {
    try {
      const res = await API.get(`/events/${id}/participants`);
      setParticipants(res.data);
    } catch (err) {
      showToast('Failed to load participants', 'error');
    }
  };

  if (loading) return <div className="spinner"></div>;

  return (
    <div>
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}

      <div className="dashboard-header">
        <h2>{user.role === 'admin' ? 'Admin Dashboard' : 'My Registrations'}</h2>
        {user.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setShowEventForm(!showEventForm)}>
            {showEventForm ? 'Cancel' : 'Create New Event'}
          </button>
        )}
      </div>

      {showEventForm && user.role === 'admin' && (
        <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3>Create Event</h3>
          <form onSubmit={handleCreateEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div className="form-group">
              <label>Title</label>
              <input required type="text" onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Department</label>
              <input required type="text" onChange={e => setFormData({...formData, department: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Event Date & Time</label>
              <input required type="datetime-local" onChange={e => setFormData({...formData, event_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Registration Deadline</label>
              <input required type="datetime-local" onChange={e => setFormData({...formData, deadline: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Max Participants</label>
              <input required type="number" min="1" onChange={e => setFormData({...formData, max_participants: e.target.value})} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Description</label>
              <textarea required rows="3" onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
            </div>
            <button className="btn btn-success" style={{ gridColumn: 'span 2', background: 'var(--success)', color: 'white' }}>Save Event</button>
          </form>
        </div>
      )}

      {participants && (
        <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Participants List</h3>
            <button className="btn btn-danger" onClick={() => setParticipants(null)}>Close</button>
          </div>
          {participants.length === 0 ? <p style={{marginTop:'1rem'}}>No one has registered yet.</p> : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Registered At</th>
                </tr>
              </thead>
              <tbody>
                {participants.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.email}</td>
                    <td>{new Date(p.registered_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="glass" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        {data.length === 0 ? (
          <p>No records found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Event Title</th>
                <th>Date</th>
                {user.role === 'admin' ? (
                  <>
                    <th>Capacity</th>
                    <th>Actions</th>
                  </>
                ) : (
                  <th>Registered On</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{new Date(item.event_date).toLocaleString()}</td>
                  {user.role === 'admin' ? (
                    <>
                      <td>{item.registered_count || 0} / {item.max_participants}</td>
                      <td>
                        <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', marginRight: '0.5rem', fontSize:'0.8rem' }} onClick={() => viewParticipants(item.id)}>View</button>
                        <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize:'0.8rem' }} onClick={() => handleDeleteEvent(item.id)}>Delete</button>
                      </td>
                    </>
                  ) : (
                    <td>{new Date(item.registered_at).toLocaleString()}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
