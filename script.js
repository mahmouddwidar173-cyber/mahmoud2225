// ==========================================
// 1. المستخدمين المسموح لهم
// ==========================================
const allowedUsers = [
  { username: "nurse", password: "123", name: "أحمد (الممرض)", role: "nurse" },
  { username: "doctor", password: "123", name: "د. محمود رضا", role: "admin" }
];

// ==========================================
// البيانات التفاعلية الحية من LocalStorage
// ==========================================
let pendingCards = JSON.parse(localStorage.getItem('pendingCards')) || [];
let archiveRecords = JSON.parse(localStorage.getItem('archiveRecords')) || [];
let approvedCount = parseInt(localStorage.getItem('approvedCount')) || 0;
let trashCount = parseInt(localStorage.getItem('trashCount')) || 0;

let currentSelectedCardId = null;
let currentTabCompany = 'all';
let cameraStream = null;
let currentCapturedImage = null; // تخزين صورة الكارت الملتقطة/المرفوعة

// ==========================================
// 2. ضمان عدم الرجوع لـ Login عند الـ Refresh
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  const savedUser = JSON.parse(localStorage.getItem('currentUser'));
  if (savedUser) {
    showDashboard(savedUser);
  } else {
    showLogin();
  }
});

function showDashboard(user) {
  document.getElementById('currentUsername').innerText = user.name;
  document.getElementById('roleBadge').innerText = user.role === 'admin' ? 'مدير النظام / دكتور' : 'ممرض / موظف التقاط';
  
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('mainNavbar').classList.remove('hidden');
  document.getElementById('mainAppLayout').classList.remove('hidden');
  
  renderPendingQueue();
  updateStats();
}

function showLogin() {
  document.getElementById('mainNavbar').classList.add('hidden');
  document.getElementById('mainAppLayout').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
}

function saveData() {
  localStorage.setItem('pendingCards', JSON.stringify(pendingCards));
  localStorage.setItem('archiveRecords', JSON.stringify(archiveRecords));
  localStorage.setItem('approvedCount', approvedCount);
  localStorage.setItem('trashCount', trashCount);
}

// ==========================================
// 3. تسجيل الدخول والخروج
// ==========================================
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const usernameInput = document.getElementById('username').value.trim();
  const passwordInput = document.getElementById('password').value.trim();
  const errorMsgDiv = document.getElementById('loginErrorMsg');
  
  if (errorMsgDiv) errorMsgDiv.classList.add('hidden');
  
  const foundUser = allowedUsers.find(u => 
    u.username.toLowerCase() === usernameInput.toLowerCase() && 
    u.password === passwordInput
  );

  if (foundUser) {
    localStorage.setItem('currentUser', JSON.stringify(foundUser));
    showDashboard(foundUser);
  } else {
    if (errorMsgDiv) errorMsgDiv.classList.remove('hidden');
  }
});

document.getElementById('logoutBtn').addEventListener('click', function() {
  localStorage.removeItem('currentUser');
  showLogin();
});

// ==========================================
// 4. التنقل بين الصفحات
// ==========================================
const navHome = document.getElementById('navHome');
const navArchive = document.getElementById('navArchive');
const dashboardScreen = document.getElementById('dashboardScreen');
const archiveScreen = document.getElementById('archiveScreen');

navHome.addEventListener('click', () => {
  navHome.classList.add('active');
  navArchive.classList.remove('active');
  dashboardScreen.classList.remove('hidden');
  archiveScreen.classList.add('hidden');
});

navArchive.addEventListener('click', () => {
  navArchive.classList.add('active');
  navHome.classList.remove('active');
  archiveScreen.classList.remove('hidden');
  dashboardScreen.classList.add('hidden');
  renderArchiveTable();
});

// ==========================================
// 5. فتح الكاميرا والتقاط/رفع الصورة
// ==========================================
const scanModal = document.getElementById('scanModal');
const webcamVideo = document.getElementById('webcamVideo');
const imagePreview = document.getElementById('imagePreview');

document.getElementById('openScanModalBtn').addEventListener('click', async () => {
  scanModal.classList.remove('hidden');
  
  // إعادة ضبط التجهيزات
  document.getElementById('patientNameInput').value = "مريض جديد";
  document.getElementById('insuranceIdInput').value = Math.floor(100000000 + Math.random() * 900000000).toString();
  currentCapturedImage = null;
  imagePreview.classList.add('hidden');
  webcamVideo.classList.remove('hidden');

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    webcamVideo.srcObject = cameraStream;
  } catch (err) {
    console.warn("Camera fallback to file upload.");
  }
});

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  scanModal.classList.add('hidden');
}

document.getElementById('closeScanModalBtn').addEventListener('click', stopCamera);

// التقاط الصورة الحقيقية من الكاميرا
document.getElementById('captureBtn').addEventListener('click', () => {
  const canvas = document.getElementById('captureCanvas');
  const context = canvas.getContext('2d');

  canvas.width = webcamVideo.videoWidth || 640;
  canvas.height = webcamVideo.videoHeight || 480;

  context.drawImage(webcamVideo, 0, 0, canvas.width, canvas.height);
  currentCapturedImage = canvas.toDataURL('image/png');

  imagePreview.src = currentCapturedImage;
  imagePreview.classList.remove('hidden');
  webcamVideo.classList.add('hidden');
});

// رفع صورة الكارت من الملفات
document.getElementById('fileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      currentCapturedImage = evt.target.result;
      imagePreview.src = currentCapturedImage;
      imagePreview.classList.remove('hidden');
      webcamVideo.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }
});

// حفظ إضافة الكارت الجديد للقائمة
document.getElementById('saveNewCardBtn').addEventListener('click', () => {
  const patientName = document.getElementById('patientNameInput').value || "مريض جديد";
  const insuranceId = document.getElementById('insuranceIdInput').value || "123456789";
  const selectedCompany = document.getElementById('companySelect').value;

  const defaultImg = "https://via.placeholder.com/300x180/0284c7/ffffff?text=" + encodeURIComponent(selectedCompany);

  const newCard = {
    id: Date.now(),
    name: patientName,
    insuranceId: insuranceId,
    provider: selectedCompany,
    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    image: currentCapturedImage || defaultImg
  };
  
  pendingCards.unshift(newCard);
  saveData();
  renderPendingQueue();
  updateStats();
  stopCamera();
});

// ==========================================
// 6. إدارة القائمة المعلقة وإدخال الـ Claim
// ==========================================
const claimModal = document.getElementById('claimModal');
document.getElementById('closeClaimModalBtn').addEventListener('click', () => {
  claimModal.classList.add('hidden');
});

function renderPendingQueue() {
  const container = document.getElementById('pendingQueueContainer');
  container.innerHTML = '';

  if (pendingCards.length === 0) {
    container.innerHTML = '<p class="sub-text" style="grid-column: 1/-1; text-align: center; padding: 30px; font-weight: bold; color: #64748b;">لا توجد كشوفات معلقة حالياً، اضغط على "فتح الكاميرا واختيار الكارت" لإضافة كارت جديد 📷</p>';
    return;
  }

  pendingCards.forEach(card => {
    container.innerHTML += `
      <div class="queue-card" id="card-${card.id}">
        <div class="card-img-wrapper">
          <img src="${card.image}" alt="صورة الكارت">
        </div>
        <div class="card-details">
          <span class="patient-name">${card.name}</span>
          <span class="card-id">رقم الكارنيه/التأمين: <strong>${card.insuranceId}</strong></span>
          <span class="provider">الشركة: <strong>${card.provider}</strong></span>
          <span class="time-stamp">الوقت: ${card.time}</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-success action-done" onclick="openClaimModal(${card.id})">Done ✅</button>
          <button class="btn btn-danger action-no" onclick="moveToTrash(${card.id})">No ❌</button>
        </div>
      </div>
    `;
  });
}

function openClaimModal(cardId) {
  currentSelectedCardId = cardId;
  const now = new Date();
  document.getElementById('claimFormNumber').value = `CLM-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  claimModal.classList.remove('hidden');
}

// تأكيد الحفظ بنقل الكارت إلى قسم الشركة المخصص
document.getElementById('confirmSaveClaimBtn').addEventListener('click', () => {
  const claimIdInput = document.getElementById('claimFormNumber').value.trim();
  if (!claimIdInput) return;

  const cardIndex = pendingCards.findIndex(c => c.id === currentSelectedCardId);
  if (cardIndex !== -1) {
    const card = pendingCards[cardIndex];
    
    archiveRecords.unshift({
      claimId: claimIdInput,
      name: card.name,
      insuranceId: card.insuranceId,
      provider: card.provider,
      date: new Date().toLocaleString('ar-EG')
    });

    pendingCards.splice(cardIndex, 1);
    approvedCount++;
    
    saveData();
    updateStats();
    renderPendingQueue();
    claimModal.classList.add('hidden');
  }
});

function moveToTrash(cardId) {
  pendingCards = pendingCards.filter(c => c.id !== cardId);
  trashCount++;
  saveData();
  updateStats();
  renderPendingQueue();
}

function updateStats() {
  document.getElementById('pendingCount').innerText = pendingCards.length;
  document.getElementById('approvedTodayCount').innerText = approvedCount;
  document.getElementById('trashCount').innerText = trashCount;
}

// ==========================================
// 7. تقسيم سجلات كل شركة في قسم منفصل
// ==========================================
function switchCompanyTab(companyName) {
  currentTabCompany = companyName;

  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    if (tab.getAttribute('onclick').includes(companyName)) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  renderArchiveTable();
}

function renderArchiveTable() {
  const tbody = document.getElementById('archiveTableBody');
  tbody.innerHTML = '';

  const filteredRecords = currentTabCompany === 'all' 
    ? archiveRecords 
    : archiveRecords.filter(rec => rec.provider.toLowerCase() === currentTabCompany.toLowerCase());

  if (filteredRecords.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #64748b;">لا توجد سجلات مرضى مسجلة في (${currentTabCompany === 'all' ? 'جميع الأقسام' : 'قسم ' + currentTabCompany}) حتى الآن</td></tr>`;
    return;
  }

  filteredRecords.forEach(rec => {
    tbody.innerHTML += `
      <tr>
        <td><code>${rec.claimId}</code></td>
        <td><strong>${rec.name}</strong></td>
        <td>${rec.insuranceId}</td>
        <td><span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:bold;">${rec.provider}</span></td>
        <td>${rec.date}</td>
        <td><span class="badge badge-success">معتمد ومؤرشف</span></td>
      </tr>
    `;
  });
}
