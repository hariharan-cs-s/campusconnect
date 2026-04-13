const API_URL = 'http://localhost:5000';

let currentUser = null;
let isLoginMode = true;
let eventsData = [];
let countdownIntervals = [];

// DOM Elements
const homeSection = document.getElementById('home-section');
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const navLinks = document.getElementById('nav-links');
const toastContainer = document.getElementById('toast-container');

// Auth Elements
const authTitle = document.getElementById('auth-title');
const authForm = document.getElementById('auth-form');
const nameGroup = document.getElementById('name-group');
const roleGroup = document.getElementById('role-group');
const authName = document.getElementById('auth-name');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authRole = document.getElementById('auth-role');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authSwitchText = document.getElementById('auth-switch-text');
const authSwitchBtn = document.getElementById('auth-switch-btn');

// Events & Dashboard Elements
const eventsGrid = document.getElementById('events-grid');
const loadingEvents = document.getElementById('loading-events');
const dashboardTitle = document.getElementById('dashboard-title');
const dashboardTable = document.getElementById('dashboard-table');
const dashboardEmptyMsg = document.getElementById('dashboard-empty-msg');
const loadingDashboard = document.getElementById('loading-dashboard');
const showEventFormBtn = document.getElementById('show-event-form-btn');
const createEventContainer = document.getElementById('create-event-container');
const createEventForm = document.getElementById('create-event-form');
const participantsContainer = document.getElementById('participants-container');
const participantsListBody = document.getElementById('participants-list-body');
const closeParticipantsBtn = document.getElementById('close-participants-btn');


// Initialization
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    currentUser = {
      token,
      name: localStorage.getItem('name'),
      role: localStorage.getItem('role')
    };
  }
  updateNav();
  showSection('home');
});

// Update Navigation Bar
function updateNav() {
  navLinks.innerHTML = `<a href="#" onclick="showSection('home')">Events</a>`;
  if (currentUser) {
    navLinks.innerHTML += `
      <a href="#" onclick="showSection('dashboard')">Dashboard</a>
      <span style="color: var(--text-muted)">| Hi, ${currentUser.name}</span>
      <button onclick="logout()" class="btn" style="background: transparent; border: 1px solid var(--border); color: white;">Logout</button>
    `;
  } else {
    navLinks.innerHTML += `<button onclick="showSection('auth')" class="btn btn-primary">Login</button>`;
  }
}

// Router equivalent
function showSection(section) {
  homeSection.classList.add('hidden');
  authSection.classList.add('hidden');
  dashboardSection.classList.add('hidden');
  
  clearTimeouts(); // Stop timers

  if (section === 'home') {
    homeSection.classList.remove('hidden');
    fetchEvents();
  } else if (section === 'auth') {
    if (currentUser) {
      showSection(currentUser.role === 'admin' ? 'dashboard' : 'home');
      return;
    }
    authSection.classList.remove('hidden');
  } else if (section === 'dashboard') {
    if (!currentUser) return showSection('auth');
    dashboardSection.classList.remove('hidden');
    setupDashboard();
  }
}

function clearTimeouts() {
    countdownIntervals.forEach(clearInterval);
    countdownIntervals = [];
}

// API Wrapper
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (currentUser?.token) headers['Authorization'] = `Bearer ${currentUser.token}`;
  
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// Toast
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerText = msg;
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// Auth Handlers
authSwitchBtn.onclick = () => {
  isLoginMode = !isLoginMode;
  authTitle.innerText = isLoginMode ? 'Welcome Back' : 'Create Account';
  authSubmitBtn.innerText = isLoginMode ? 'Login' : 'Sign Up';
  authSwitchText.innerHTML = isLoginMode ? "Don't have an account? <span id='auth-switch-btn'>Sign up</span>" : "Already have an account? <span id='auth-switch-btn'>Login</span>";
  if (isLoginMode) {
    nameGroup.classList.add('hidden');
    roleGroup.classList.add('hidden');
    authName.removeAttribute('required');
  } else {
    nameGroup.classList.remove('hidden');
    roleGroup.classList.remove('hidden');
    authName.setAttribute('required', 'true');
  }
  document.getElementById('auth-switch-btn').onclick = authSwitchBtn.onclick;
};

authForm.onsubmit = async (e) => {
  e.preventDefault();
  authSubmitBtn.disabled = true;
  authSubmitBtn.innerText = 'Processing...';
  try {
    if (!isLoginMode) {
      await apiCall('/auth/signup', 'POST', {
        name: authName.value,
        email: authEmail.value,
        password: authPassword.value,
        role: authRole.value
      });
    }
    const data = await apiCall('/auth/login', 'POST', { email: authEmail.value, password: authPassword.value });
    localStorage.setItem('token', data.token);
    localStorage.setItem('name', data.name);
    localStorage.setItem('role', data.role);
    currentUser = data;
    showToast('Logged in successfully', 'success');
    updateNav();
    showSection(currentUser.role === 'admin' ? 'dashboard' : 'home');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.innerText = isLoginMode ? 'Login' : 'Sign Up';
  }
};

function logout() {
  localStorage.clear();
  currentUser = null;
  updateNav();
  showSection('home');
}

// Events Listing
async function fetchEvents() {
  loadingEvents.classList.remove('hidden');
  eventsGrid.innerHTML = '';
  try {
    eventsData = await apiCall('/events');
    renderEvents();
  } catch(err) {
    showToast('Failed to load events', 'error');
  } finally {
    loadingEvents.classList.add('hidden');
  }
}

function renderEvents() {
    eventsGrid.innerHTML = '';
    
    if(eventsData.length === 0) {
        eventsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No upcoming events.</p>';
        return;
    }

    eventsData.forEach(event => {
        const isClosed = new Date() > new Date(event.deadline);
        const isFull = event.registered_count >= event.max_participants;
        const progress = (event.registered_count / event.max_participants) * 100;
        
        const card = document.createElement('div');
        card.className = 'event-card glass';
        card.innerHTML = `
            <div class="event-header">
                <h3 class="event-title">${event.title}</h3>
                <span class="badge">${event.department}</span>
            </div>
            <p style="font-size: 0.9rem; flex-grow: 1">${event.description}</p>
            <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem">
                    <span>📅 ${new Date(event.event_date).toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; align-items: center;">
                    <span>⏳ Deadline:</span>
                    <span class="countdown" id="cd-${event.id}"></span>
                </div>
                <div style="margin-top: 0.5rem">
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem">
                        <span>Capacity: ${event.registered_count} / ${event.max_participants}</span>
                        <span>${progress.toFixed(0)}%</span>
                    </div>
                    <div class="progress-bg">
                        <div class="progress-fill ${isFull ? 'full' : ''}" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>
            <button class="btn btn-primary" style="width: 100%; margin-top: 1rem" 
                ${isClosed || isFull ? 'disabled' : ''} 
                onclick="registerEvent(${event.id})">
                ${isClosed ? 'Closed' : isFull ? 'Full' : 'Register Now'}
            </button>
        `;
        eventsGrid.appendChild(card);
        startCountdown(event.id, event.deadline);
    });
}

function startCountdown(id, deadline) {
    const el = document.getElementById(`cd-${id}`);
    const end = new Date(deadline);
    
    function update() {
        if(!el) return;
        const diff = end - new Date();
        if (diff <= 0) {
            el.innerText = 'Registration Closed';
            return;
        }
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        el.innerText = `${d}d ${h}h ${m}m`;
    }
    update();
    countdownIntervals.push(setInterval(update, 1000));
}

async function registerEvent(id) {
    if (!currentUser) return showToast('Please login to register', 'error');
    if (currentUser.role === 'admin') return showToast('Admins cannot register', 'error');
    try {
        await apiCall(`/events/${id}/register`, 'POST');
        showToast('Successfully registered!', 'success');
        fetchEvents();
    } catch(err) {
        showToast(err.message, 'error');
    }
}

// Dashboard Logic
async function setupDashboard() {
    dashboardTitle.innerText = currentUser.role === 'admin' ? 'Admin Dashboard' : 'My Registrations';
    createEventContainer.classList.add('hidden');
    participantsContainer.classList.add('hidden');
    dashboardTable.innerHTML = '';
    
    if (currentUser.role === 'admin') {
        showEventFormBtn.classList.remove('hidden');
        showEventFormBtn.innerText = 'Create New Event';
        showEventFormBtn.onclick = () => {
            const isHidden = createEventContainer.classList.contains('hidden');
            createEventContainer.classList.toggle('hidden', !isHidden);
            showEventFormBtn.innerText = isHidden ? 'Cancel' : 'Create New Event';
        };
    } else {
        showEventFormBtn.classList.add('hidden');
    }

    loadingDashboard.classList.remove('hidden');
    dashboardEmptyMsg.classList.add('hidden');
    
    try {
        let endpoint = currentUser.role === 'admin' ? '/events' : '/users/me/registrations';
        const data = await apiCall(endpoint);
        renderDashboard(data);
    } catch(err) {
        showToast('Failed to load dashboard', 'error');
    } finally {
        loadingDashboard.classList.add('hidden');
    }
}

function renderDashboard(data) {
    if(data.length === 0) {
        dashboardEmptyMsg.classList.remove('hidden');
        return;
    }

    let html = `<thead><tr>
        <th>Event Title</th>
        <th>Date</th>
        ${currentUser.role === 'admin' ? '<th>Capacity</th><th>Actions</th>' : '<th>Registered On</th>'}
    </tr></thead><tbody>`;

    data.forEach(item => {
        html += `<tr>
            <td>${item.title}</td>
            <td>${new Date(item.event_date).toLocaleString()}</td>
            ${currentUser.role === 'admin' ? `
                <td>${item.registered_count || 0} / ${item.max_participants}</td>
                <td>
                    <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; margin-right: 0.5rem; font-size:0.8rem" onclick="viewParticipants(${item.id})">View</button>
                    <button class="btn btn-danger" style="padding: 0.4rem 0.8rem; font-size:0.8rem" onclick="deleteEvent(${item.id})">Delete</button>
                </td>
            ` : `
                <td>${new Date(item.registered_at).toLocaleString()}</td>
            `}
        </tr>`;
    });
    
    html += '</tbody>';
    dashboardTable.innerHTML = html;
}

// Admin Actions
createEventForm.onsubmit = async (e) => {
    e.preventDefault();
    try {
        await apiCall('/events', 'POST', {
            title: document.getElementById('event-title').value,
            department: document.getElementById('event-dept').value,
            event_date: document.getElementById('event-date').value,
            deadline: document.getElementById('event-deadline').value,
            max_participants: document.getElementById('event-max').value,
            description: document.getElementById('event-desc').value
        });
        showToast('Event created', 'success');
        createEventForm.reset();
        createEventContainer.classList.add('hidden');
        showEventFormBtn.innerText = 'Create New Event';
        setupDashboard();
    } catch(err) {
        showToast(err.message, 'error');
    }
};

async function viewParticipants(id) {
    participantsContainer.classList.remove('hidden');
    participantsListBody.innerHTML = '<div class="spinner"></div>';
    try {
        const data = await apiCall(`/events/${id}/participants`);
        if(data.length === 0) {
            participantsListBody.innerHTML = '<p>No one has registered yet.</p>';
        } else {
            let html = `<table><thead><tr><th>Name</th><th>Email</th><th>Registered At</th></tr></thead><tbody>`;
            data.forEach(p => {
                html += `<tr><td>${p.name}</td><td>${p.email}</td><td>${new Date(p.registered_at).toLocaleString()}</td></tr>`;
            });
            html += '</tbody></table>';
            participantsListBody.innerHTML = html;
        }
    } catch(err) {
        participantsListBody.innerHTML = '<p>Failed to load.</p>';
        showToast('Failed to load participants', 'error');
    }
}

closeParticipantsBtn.onclick = () => participantsContainer.classList.add('hidden');

async function deleteEvent(id) {
    if(!confirm('Are you sure you want to delete this event?')) return;
    try {
        await apiCall(`/events/${id}`, 'DELETE');
        showToast('Event deleted', 'success');
        setupDashboard();
    } catch(err) {
        showToast(err.message, 'error');
    }
}
