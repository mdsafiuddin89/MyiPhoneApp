// js/firebase.js

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBTYh_HQbewFiWak0OGYrM7C-w4zRTkT2k",
  authDomain: "credentialsmanager-deec3.firebaseapp.com",
  projectId: "credentialsmanager-deec3",
  storageBucket: "credentialsmanager-deec3.appspot.com",
  messagingSenderId: "270291675159",
  appId: "1:270291675159:web:3804878fe6e175c7511452"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  window.db = firebase.firestore();
}
const auth = firebase.auth();
const db = firebase.firestore();

// ==================== AUTHENTICATION ====================

function login() {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  if (!email || !password) {
    showAlert("Please enter email and password", "error");
    return;
  }
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      logActivity("login");
      window.location.href = "dashboard.html";
    })
    .catch(err => showAlert(err.message, "error"));
}

function register() {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  if (!email || !password) {
    showAlert("Please enter email and password", "error");
    return;
  }
  auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      const uid = userCredential.user.uid;
      return db.collection("users").doc(uid).set({
        email: email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      showAlert("Registration successful!", "success");
      setTimeout(() => window.location.href = "dashboard.html", 1500);
    })
    .catch(err => showAlert(err.message, "error"));
}

function resetPassword() {
  const email = document.getElementById("email")?.value;
  if (!email) {
    showAlert("Please enter your email", "error");
    return;
  }
  auth.sendPasswordResetEmail(email)
    .then(() => showAlert("Reset link sent to your email!", "success"))
    .catch(err => showAlert(err.message, "error"));
}

function logout() {
  auth.signOut().then(() => window.location.href = "index.html");
}

function getUserCollection(name) {
  const user = auth.currentUser;
  if (!user) {
    showAlert("Please sign in to access your data", "error");
    return null;
  }
  return db.collection("users").doc(user.uid).collection(name);
}

// ==================== EMPLOYEE CRUD ====================

function getEmployeeFormData() {
  return {
    name: document.getElementById("name")?.value || "",
    website: document.getElementById("website")?.value || "",
    username: document.getElementById("username")?.value || "",
    password: document.getElementById("password")?.value || "",
    email: document.getElementById("email")?.value || "",
    phone: document.getElementById("phone")?.value || "",
    platform: document.getElementById("platform")?.value || ""
  };
}

function addEmployee() {
  const emp = getEmployeeFormData();
  if (!emp.name || !emp.username || !emp.password || !emp.email) {
    showAlert("Please fill in all required fields", "error");
    return;
  }
  const employees = getUserCollection("employees");
  if (!employees) return;
  employees.add(emp)
    .then(() => {
      showAlert("Credential added successfully!", "success");
      // Wait longer to ensure Firebase syncs before redirecting
      setTimeout(() => window.location.href = "dashboard.html", 2000);
    })
    .catch(error => showAlert("Failed to add credential: " + error.message, "error"));
}

function updateEmployee() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    showAlert("No credential ID provided", "error");
    return;
  }
  const updated = getEmployeeFormData();
  if (!updated.name || !updated.username || !updated.password || !updated.email) {
    showAlert("Please fill in all required fields", "error");
    return;
  }
  const employees = getUserCollection("employees");
  if (!employees) return;
  employees.doc(id).update(updated)
    .then(() => {
      showAlert("Credential updated successfully!", "success");
      // Wait longer to ensure Firebase syncs before redirecting
      setTimeout(() => window.location.href = "dashboard.html", 2000);
    })
    .catch(error => showAlert("Failed to update: " + error.message, "error"));
}

function deleteEmployee(id) {
  const employees = getUserCollection("employees");
  if (!employees) return;
  employees.doc(id).delete()
    .then(() => {
      showToast("Credential deleted", "success");
      const selectAll = document.getElementById("selectAll");
      if (selectAll) selectAll.checked = false;
      setTimeout(() => loadEmployees(), 400);
    })
    .catch(err => showToast("Error: " + err.message, "error"));
}

function deleteSelected() {
  const selected = document.querySelectorAll(".selectRow:checked");
  if (!selected.length) {
    showToast("No rows selected", "info");
    return;
  }
  const employees = getUserCollection("employees");
  if (!employees) return;
  const batch = db.batch();
  selected.forEach(cb => batch.delete(employees.doc(cb.dataset.id)));
  batch.commit().then(() => {
    showToast(`${selected.length} deleted`, "success");
    const selectAll = document.getElementById("selectAll");
    if (selectAll) selectAll.checked = false;
    setTimeout(() => loadEmployees(), 400);
  })
    .catch(err => showToast("Error: " + err.message, "error"));
}

// ==================== DASHBOARD - LOAD & RENDER ====================

// Store reference to select all listener to prevent duplicates
let selectAllListener = null;

function loadEmployees() {
  const employees = getUserCollection("employees");
  if (!employees) return;
  employees.get().then(snapshot => {
    const rows = [];
    const platforms = new Set();
    const emails = new Set();

    snapshot.forEach(doc => {
      const emp = doc.data();
      platforms.add(emp.platform || "");
      emails.add(emp.email || "");

      rows.push(`
        <tr>
          <td><input type="checkbox" class="selectRow" data-id="${doc.id}" /></td>
          <td style="font-weight:500;">${esc(emp.name)}</td>
          <td><span class="badge">${esc(emp.platform) || "—"}</span></td>
          <td><a href="${esc(emp.website)}" target="_blank" rel="noopener" style="color:var(--accent);font-size:0.75rem;text-decoration:none;font-family:var(--font-mono);" title="${esc(emp.website)}">${truncate(emp.website, 24)}</a></td>
          <td style="font-family:var(--font-mono);font-size:0.78rem;">${esc(emp.username)}</td>
          <td>
            <div class="pw-cell">
              <input type="password" class="password-field" value="${esc(getDecodedPassword(emp.password))}" readonly />
              <button class="pw-toggle" onclick="togglePw(this)" title="Show/hide password">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button class="pw-copy" onclick="copyPassword(this)" title="Copy password">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="11" height="11" rx="2" ry="2"/>
                  <path d="M5 15V5a2 2 0 0 1 2-2h9"/>
                </svg>
              </button>
            </div>
          </td>
          <td style="font-size:0.78rem;">${esc(getEmailLocalPart(emp.email))}</td>
          <td><span class="phone-chip">${esc(emp.phone)}</span></td>
          <td>
            <div class="action-links">
              <a class="action-link edit" href="edit.html?id=${doc.id}" title="Edit credential">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </a>
              <button class="action-link del" onclick="deleteEmployee('${doc.id}')" title="Delete credential">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `);
    });

    let bodyHTML = rows.join("");
    if (!bodyHTML) {
      bodyHTML = `
        <tr>
          <td style="text-align:center;color:var(--text-3);padding:2rem;font-family:var(--font-mono);font-size:0.78rem;"></td>
          <td style="text-align:center;color:var(--text-3);padding:2rem;font-family:var(--font-mono);font-size:0.78rem;">No credentials found.</td>
          <td style="text-align:center;color:var(--text-3);padding:2rem;font-family:var(--font-mono);font-size:0.78rem;"><a href="add.html" style="color:var(--accent);">Add one →</a></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;
    }

    document.getElementById("statTotal").textContent = snapshot.size;
    document.getElementById("statPlatforms").textContent = [...platforms].filter(Boolean).length;
    document.getElementById("statEmails").textContent = [...emails].filter(Boolean).length;

    // Destroy and properly reinitialize DataTable before replacing rows
    if ($.fn.DataTable.isDataTable("#employeeTable")) {
      const table = $("#employeeTable").DataTable();
      table.clear();
      table.destroy();
    }

    document.getElementById("employeeData").innerHTML = bodyHTML;

    // Reattach selectAll listener with proper cleanup
    const selectAllCheckbox = document.getElementById("selectAll");
    if (selectAllCheckbox) {
      if (selectAllListener) {
        selectAllCheckbox.removeEventListener("change", selectAllListener);
      }
      selectAllListener = function () {
        document.querySelectorAll(".selectRow").forEach(cb => cb.checked = this.checked);
      };
      selectAllCheckbox.addEventListener("change", selectAllListener);
    }

    // Reinitialize DataTable after DOM update
    setTimeout(() => {
      $("#employeeTable").DataTable({
        destroy: true,
        pageLength: 10,
        language: { search: "", lengthMenu: "Show _MENU_" }
      });
    }, 150);

  }).catch(err => showToast("Error loading data: " + err.message, "error"));
}

// ==================== EXPORT & IMPORT ====================

function exportToExcel() {
  const employees = getUserCollection("employees");
  if (!employees) return;
  employees.get().then(snapshot => {
    const data = snapshot.docs.map(doc => {
      const emp = doc.data();
      return {
        Name: emp.name,
        Website: emp.website,
        Username: emp.username,
        Password: emp.password,
        Email: emp.email,
        Phone: emp.phone,
        Platform: emp.platform
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Credentials");
    XLSX.writeFile(wb, "credentials.xlsx");
    showToast("Export complete", "success");
  });
}

function importFromExcel() {
  const file = document.getElementById("excelFile").files[0];
  if (!file) return;
  const employeesCollection = getUserCollection("employees");
  if (!employeesCollection) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
    const employees = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const batch = db.batch();
    employees.forEach(emp => {
      batch.set(employeesCollection.doc(), {
        name: emp.Name || "",
        website: emp.Website || "",
        username: emp.Username || "",
        password: emp.Password || "",
        email: emp.Email || "",
        phone: emp.Phone || "",
        platform: emp.Platform || ""
      });
    });
    batch.commit().then(() => {
      showToast(`Imported ${employees.length} records`, "success");
      const excelFile = document.getElementById("excelFile");
      if (excelFile) excelFile.value = "";
      // Use longer delay for import to ensure Firebase syncs
      setTimeout(() => loadEmployees(), 500);
    })
      .catch(err => showToast("Import failed: " + err.message, "error"));
  };
  reader.readAsArrayBuffer(file);
}

// ==================== UTILITY FUNCTIONS ====================

function getDecodedPassword(value) {
  if (!value) return "";
  return value;
}

function getEmailLocalPart(email) {
  if (!email) return "";
  const local = String(email).split("@")[0] || email;
  return local;
}

function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function truncate(str, n) {
  if (!str) return "—";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

// ==================== UI FUNCTIONS ====================

function togglePw(element, btn) {
  let inp;
  
  // Case 1: Called with (id, button) from add/edit forms
  if (typeof element === 'string' && btn) {
    inp = document.getElementById(element);
  }
  // Case 2: Called with button element from dashboard
  else if (element && element.closest) {
    inp = element.closest('.pw-cell')?.querySelector('.password-field');
    btn = element;
  }

  if (!inp) return;

  const isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';

  if (btn) {
    btn.innerHTML = isHidden
      ? `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-7-11-7a18.77 18.77 0 015.17-5.58M9.88 9.88A3 3 0 0114.12 14.12M3 3l18 18"/></svg>`
      : `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }
}

function copyPassword(btn) {
  const inp = btn.closest(".pw-cell").querySelector(".password-field");
  const password = inp.value || "";
  if (!password) {
    showToast("Nothing to copy", "info");
    return;
  }
  navigator.clipboard.writeText(password)
    .then(() => showToast("Password copied", "success"))
    .catch(() => showToast("Copy failed, try again", "error"));
}

function showToast(msg, type = "info") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const icons = { success: "✓", error: "✕", info: "ℹ" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || "ℹ"}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function showAlert(msg, type = "info") {
  showToast(msg, type);
}

function setupThemeToggle() {
  const themeToggle = document.getElementById("theme-toggle");
  if (!themeToggle) return;

  const currentTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", currentTheme);
  updateThemeIcon(currentTheme);

  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon(newTheme);
  });
}

function updateThemeIcon(theme) {
  const themeToggle = document.getElementById("theme-toggle");
  if (!themeToggle) return;

  const icon = themeToggle.querySelector("svg");
  if (theme === "light") {
    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>';
  } else {
    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>';
  }
}

function setupDashboardUIListeners() {
  // Search input - attach once, works with DataTable updates
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      if ($.fn.DataTable.isDataTable("#employeeTable")) {
        $("#employeeTable").DataTable().search(this.value).draw();
      }
    });
  }

  // User avatar dropdown
  const userAvatar = document.getElementById("userAvatar");
  if (userAvatar) {
    userAvatar.addEventListener("click", () => {
      const userDropdown = document.getElementById("userDropdown");
      if (userDropdown) userDropdown.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#userAvatar")) {
        const userDropdown = document.getElementById("userDropdown");
        if (userDropdown) userDropdown.classList.remove("show");
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      firebase.auth().signOut().then(() => window.location.href = "index.html");
    });
  }
}

function setupFormPageListeners() {
  const addBtn = document.getElementById("addBtn");
  if (addBtn) {
    addBtn.addEventListener("click", addEmployee);
  }

  const updateBtn = document.getElementById("updateBtn");
  if (updateBtn) {
    updateBtn.addEventListener("click", updateEmployee);
  }

}

function loadEmployeeForEdit() {
  const editDocId = document.getElementById("editDocId");
  if (editDocId) {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) {
      const employees = getUserCollection("employees");
      if (!employees) return;
      employees.doc(id).get().then(doc => {
        if (doc.exists) {
          const emp = doc.data();
          document.getElementById("name").value = emp.name || "";
          document.getElementById("platform").value = emp.platform || "";
          document.getElementById("website").value = emp.website || "";
          document.getElementById("username").value = emp.username || "";
          document.getElementById("password").value = emp.password || "";
          document.getElementById("email").value = emp.email || "";
          document.getElementById("phone").value = emp.phone || "";
          editDocId.textContent = `ID: ${id}`;
        }
      }).catch(err => showAlert("Failed to load credential: " + err.message, "error"));
    }
  }
}

function setupMobileSidebar() {
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const wrapper = document.querySelector('.wrapper');

  if (!sidebar || !wrapper) return;

  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    wrapper.appendChild(overlay);
  }

  if (menuToggle) {
    // Remove existing listener to avoid duplicates
    const newMenuToggle = menuToggle.cloneNode(true);
    menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);

    newMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('active');
      overlay.classList.toggle('active');
    });
  }

  const closeBtn = sidebar.querySelector('.sidebar-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
    });
  }

  // Close when clicking overlay
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
  });

  // Close when clicking any nav item
  const navItems = sidebar.querySelectorAll('a, button');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
    });
  });
}

// ==================== ACTIVITY LOGGING ====================

function logActivity(action) {
  const user = firebase.auth().currentUser;
  if (!user) return;

  db.collection("users").doc(user.uid).collection("activityLogs").add({
    userId: user.uid,
    action: action,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ==================== INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", () => {
  setupThemeToggle();
  setupDashboardUIListeners();
  setupFormPageListeners();
  setupMobileSidebar();
});

// ==================== AUTH STATE HANDLER ====================

firebase.auth().onAuthStateChanged((user) => {
  const isDashboard = window.location.pathname.includes("dashboard");
  const isAdd = window.location.pathname.includes("add");
  const isEdit = window.location.pathname.includes("edit");

  if (isDashboard || isAdd || isEdit) {
    if (user) {
      if (isDashboard) {
        const initial = (user.email || "U")[0].toUpperCase();
        const userAvatar = document.getElementById("userAvatar");
        if (userAvatar) {
          userAvatar.childNodes[0].textContent = initial;
        }
        logActivity("login");
        loadEmployees();
      }
      if (isEdit) {
        loadEmployeeForEdit();
      }
    } else {
      window.location.href = "index.html";
    }
  }
});

// ==================== GLOBAL SCOPE ====================

window.login = login;
window.register = register;
window.resetPassword = resetPassword;
window.logout = logout;
window.addEmployee = addEmployee;
window.updateEmployee = updateEmployee;
window.deleteEmployee = deleteEmployee;
window.deleteSelected = deleteSelected;
window.importFromExcel = importFromExcel;
window.exportToExcel = exportToExcel;
window.loadEmployees = loadEmployees;
window.togglePw = togglePw;
window.copyPassword = copyPassword;
window.showToast = showToast;
window.showAlert = showAlert;

