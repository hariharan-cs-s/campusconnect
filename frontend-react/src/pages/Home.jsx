import { useState, useEffect } from 'react';
import API from '../api';

function Home({ user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data } = await API.get('/events');
      setEvents(data);
    } catch (err) {
      showToast('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRegister = async (eventId) => {
    if (!user) return showToast('Please login to register', 'error');
    if (user.role === 'admin') return showToast('Admins cannot register for events', 'error');
    
    try {
      await API.post(`/events/${eventId}/register`);
      showToast('Successfully registered!', 'success');
      fetchEvents(); // Refresh counts
    } catch (err) {
      showToast(err.response?.data?.error || 'Registration failed', 'error');
    }
  };

  // Countdown Component
  const Countdown = ({ deadline }) => {
    const [timeLeft, setTimeLeft] = useState('');
    
    useEffect(() => {
      const interval = setInterval(() => {
        const now = new Date();
        const end = new Date(deadline);
        const diff = end - now;
        
        if (diff <= 0) {
          setTimeLeft('Registration Closed');
          clearInterval(interval);
          return;
        }
        
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        setTimeLeft(`${d}d ${h}h ${m}m`);
      }, 1000);
      return () => clearInterval(interval);
    }, [deadline]);

    return <span className="countdown">{timeLeft}</span>;
  };

  if (loading) return <div className="spinner"></div>;

  return (
    <div>
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}
      
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Upcoming Campus Events</h1>
        <p>Discover and register for the best events happening on campus.</p>
      </div>

      <div className="events-grid">
        {events.map((event) => {
          const isClosed = new Date() > new Date(event.deadline);
          const isFull = event.registered_count >= event.max_participants;
          const progress = (event.registered_count / event.max_participants) * 100;

          return (
            <div key={event.id} className="event-card glass">
              <div className="event-header">
                <h3 className="event-title">{event.title}</h3>
                <span className="badge">{event.department}</span>
              </div>
              <p style={{ fontSize: '0.9rem', flexGrow: 1 }}>{event.description}</p>
              
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>📅 {new Date(event.event_date).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                  <span>⏳ Deadline:</span>
                  <Countdown deadline={event.deadline} />
                </div>
                
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>Capacity: {event.registered_count} / {event.max_participants}</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="progress-bg">
                    <div className={`progress-fill ${isFull ? 'full' : ''}`} style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={isClosed || isFull}
                onClick={() => handleRegister(event.id)}
              >
                {isClosed ? 'Closed' : isFull ? 'Full' : 'Register Now'}
              </button>
            </div>
          );
        })}
      </div>
      {events.length === 0 && <p style={{ textAlign: 'center', marginTop: '2rem' }}>No upcoming events.</p>}
    </div>
  );
}

export default Home;
