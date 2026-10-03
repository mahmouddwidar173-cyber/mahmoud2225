// ==========================================
// 1. تحديد المستخدمين المسموح لهم بالدخول
// ==========================================
const allowedUsers = [
  {
    username: "nurse",
    password: "123",
    name: "أحمد (الممرض)",
    role: "nurse"
  },
  {
    username: "doctor",
    password: "123",
    name: "د. محمود رضا",
    role: "admin"
  }
];

// ==========================================
// البيانات التفاعلية (صفر بالكامل)
// ==========================================
let pendingCards = [];
let archiveRecords = [];
let approvedCount = 0;
let trashCount = 0;
let currentSelectedCardId = null;

// ==========================================
// 2. تسجيل الدخول الذكي
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
    document.getElementById('currentUsername').innerText = foundUser.name;
    document.getElementById('roleBadge').innerText = foundUser.role === 'admin' ? 'مدير النظام / دكتور' : 'ممرض / موظف التقاط';
    
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainNavbar').classList.remove('hidden');
    document.getElementById('mainAppLayout').classList.remove('hidden');
    
    // إظهار الواجهة التفاعلية الفاضية في البداية
    renderPendingQueue();
    updateStats();
  } else {
    if (errorMsgDiv) errorMsgDiv.classList.remove('hidden');
  }
});

// زر الخروج
document.getElementById('logoutBtn').addEventListener('click', function() {
  document.getElementById('mainNavbar').classList.add('hidden');
  document.getElementById('mainAppLayout').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
});

// ==========================================
// 3. التنقل بين الصفحات
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
// 4. إدارة النوافذ والمسح الذكي
// ==========================================
const scanModal = document.getElementById('scanModal');
document.getElementById('openScanModalBtn').addEventListener('click', () => {
  scanModal.classList.remove('hidden');
});
document.getElementById('closeScanModalBtn').addEventListener('click', () => {
  scanModal.classList.add('hidden');
});

// عند الضغط على التقاط صورة كارت جديد
document.getElementById('captureBtn').addEventListener('click', () => {
  const newCard = {
    id: Date.now(),
    name: "مريض جديد (Scanned)",
    insuranceId: Math.floor(100000000 + Math.random() * 900000000).toString(),
    provider: "شركة التأمين الطبي",
    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    image: "https://via.placeholder.com/300x180/e0f2fe/0284c7?text=Scanned+Card"
  };
  
  // إضافة الكارت الجديد لقائمة الانتظار
  pendingCards.unshift(newCard);
  
  // تحديث العدادات والشاشة أوتوماتيكياً
  renderPendingQueue();
  updateStats();
  scanModal.classList.add('hidden');
});

// نافذة الـ Claim Form
const claimModal = document.getElementById('claimModal');
document.getElementById('closeClaimModalBtn').addEventListener('click', () => {
  claimModal.classList.add('hidden');
});

// ==========================================
// 5. إدارة قائمة الانتظار والإجراءات التفاعلية
// ==========================================

function renderPendingQueue() {
  const container = document.getElementById('pendingQueueContainer');
  container.innerHTML = '';

  if (pendingCards.length === 0) {
    container.innerHTML = '<p class="sub-text" style="grid-column: 1/-1; text-align: center; padding: 30px; font-weight: bold; color: #64748b;">لا توجد كشوفات معلقة حالياً، اضغط على "فتح الكاميرا والالتقاط" لإضافة كارت جديد 📷</p>';
    return;
  }

  pendingCards.forEach(card => {
    const cardHTML = `
      <div class="queue-card" id="card-${card.id}">
        <div class="card-img-wrapper">
          <img src="${card.image}" alt="صورة الكارت">
        </div>
        <div class="card-details">
          <span class="patient-name">${card.name}</span>
          <span class="card-id">رقم التأمين: ${card.insuranceId}</span>
          <span class="provider">الشركة: ${card.provider}</span>
          <span class="time-stamp">الوقت: ${card.time}</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-success action-done" onclick="openClaimModal(${card.id})">Done ✅</button>
          <button class="btn btn-danger action-no" onclick="moveToTrash(${card.id})">No ❌</button>
        </div>
      </div>
    `;
    container.innerHTML += cardHTML;
  });
}

function openClaimModal(cardId) {
  currentSelectedCardId = cardId;
  const now = new Date();
  document.getElementById('claimFormNumber').value = `CLM-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  claimModal.classList.remove('hidden');
}

// تأكيد الحفظ الاعتماد (Done)
document.getElementById('confirmSaveClaimBtn').addEventListener('click', () => {
  const claimIdInput = document.getElementById('claimFormNumber').value;
  if (!claimIdInput) return;

  const cardIndex = pendingCards.findIndex(c => c.id === currentSelectedCardId);
  if (cardIndex !== -1) {
    const card = pendingCards[cardIndex];
    
    // إضافة للأرشيف
    archiveRecords.unshift({
      claimId: claimIdInput,
      name: card.name,
      insuranceId: card.insuranceId,
      provider: card.provider,
      date: new Date().toLocaleString('ar-EG')
    });

    // خصم من الـ Pending وزيادة الـ Approved
    pendingCards.splice(cardIndex, 1);
    approvedCount++;
    
    updateStats();
    renderPendingQueue();
    claimModal.classList.add('hidden');
  }
});

// إلغاء الكارت (No)
function moveToTrash(cardId) {
  pendingCards = pendingCards.filter(c => c.id !== cardId);
  trashCount++; // زيادة عداد الملغاة
  updateStats();
  renderPendingQueue();
}

// تحديث الأرقام والعدادات لحظياً
function updateStats() {
  document.getElementById('pendingCount').innerText = pendingCards.length;
  document.getElementById('approvedTodayCount').innerText = approvedCount;
  document.getElementById('trashCount').innerText = trashCount;
}

function renderArchiveTable() {
  const tbody = document.getElementById('archiveTableBody');
  tbody.innerHTML = '';

  if (archiveRecords.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #64748b;">لا توجد سجلات مؤرشفة بعد</td></tr>';
    return;
  }

  archiveRecords.forEach(rec => {
    tbody.innerHTML += `
      <tr>
        <td><code>${rec.claimId}</code></td>
        <td>${rec.name}</td>
        <td>${rec.insuranceId}</td>
        <td>${rec.provider}</td>
        <td>${rec.date}</td>
        <td><span class="badge badge-success">مكتمل ومخزن</span></td>
      </tr>
    `;
  });
}