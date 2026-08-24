import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase.js';

const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const dashboardError = document.getElementById('dashboardError');
const bookingsList = document.getElementById('bookingsList');
const contactsList = document.getElementById('contactsList');
let stopBookings;
let stopContacts;
let bookings = [];
let contacts = [];

const labels = {
  'Full Name': 'Customer', 'Phone Number': 'Phone', 'Email Address': 'Email',
  'Preferred Date': 'Date', 'Preferred Time': 'Time', 'Has Injuries': 'Injuries',
  'Injury Details': 'Injury details', 'Medical Conditions': 'Medical conditions',
  'Is Pregnant': 'Pregnant', 'Had Massage Before': 'Previous massage',
  'Pressure Preference': 'Pressure', 'Focus Areas': 'Focus areas',
  'Therapist Gender Pref': 'Therapist preference', 'Special Requests': 'Special requests',
  'Payment Method': 'Payment', fullName: 'Customer', phone: 'Phone', email: 'Email',
};

function formatDate(timestamp) {
  return timestamp?.toDate
    ? timestamp.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'Just submitted';
}

function displayValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
}

function renderRecords(container, records, type) {
  container.replaceChildren();
  if (!records.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = `No ${type} received yet.`;
    container.append(empty);
    return;
  }

  records.forEach(({ id, ...data }) => {
    const card = document.createElement('article');
    card.className = 'record';
    const header = document.createElement('div');
    header.className = 'record-header';
    const titleWrap = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = data['Full Name'] || data.fullName || 'Unnamed customer';
    const time = document.createElement('span');
    time.className = 'record-time';
    time.textContent = formatDate(data.createdAt);
    titleWrap.append(title, time);

    const status = document.createElement('select');
    status.className = 'status';
    ['new', 'contacted', 'confirmed', 'completed'].forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value[0].toUpperCase() + value.slice(1);
      option.selected = data.status === value;
      status.append(option);
    });
    status.addEventListener('change', async () => {
      status.disabled = true;
      try {
        await updateDoc(doc(db, type, id), { status: status.value });
      } catch (error) {
        dashboardError.textContent = 'The status could not be updated.';
        console.error(error);
      } finally {
        status.disabled = false;
      }
    });
    header.append(titleWrap, status);

    const details = document.createElement('dl');
    details.className = 'details';
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'createdAt' || key === 'status') return;
      const group = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = labels[key] || key;
      description.textContent = displayValue(value);
      group.append(term, description);
      details.append(group);
    });
    card.append(header, details);
    container.append(card);
  });
}

function updateCounts() {
  document.getElementById('bookingCount').textContent = bookings.length;
  document.getElementById('contactCount').textContent = contacts.length;
  document.getElementById('newCount').textContent = [...bookings, ...contacts]
    .filter((item) => item.status === 'new').length;
}

function subscribeToCollection(name, container, setter) {
  return onSnapshot(query(collection(db, name), orderBy('createdAt', 'desc')), (snapshot) => {
    const records = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    setter(records);
    renderRecords(container, records, name);
    updateCounts();
    dashboardError.textContent = '';
  }, (error) => {
    console.error(error);
    dashboardError.textContent = 'Records could not be loaded. Check your Firestore rules and connection.';
  });
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector('button');
  button.disabled = true;
  loginError.textContent = '';
  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById('adminEmail').value.trim(),
      document.getElementById('adminPassword').value,
    );
    loginForm.reset();
  } catch (error) {
    console.error(error);
    loginError.textContent = 'Incorrect email or password, or Email/Password sign-in is not enabled.';
  } finally {
    button.disabled = false;
  }
});

document.getElementById('logoutButton').addEventListener('click', () => signOut(auth));

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item === tab));
    document.querySelectorAll('.panel').forEach((panel) => panel.classList.toggle('hidden', panel.id !== tab.dataset.panel));
  });
});

onAuthStateChanged(auth, (user) => {
  loginView.classList.toggle('hidden', Boolean(user));
  dashboardView.classList.toggle('hidden', !user);
  stopBookings?.();
  stopContacts?.();
  if (!user) return;
  document.getElementById('adminIdentity').textContent = user.email;
  stopBookings = subscribeToCollection('bookings', bookingsList, (items) => { bookings = items; });
  stopContacts = subscribeToCollection('contacts', contactsList, (items) => { contacts = items; });
});
