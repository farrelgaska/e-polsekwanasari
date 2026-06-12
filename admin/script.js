const API_BASE = "https://farrelgaskagithubio-production.up.railway.app";
const API_URL = "https://farrelgaskagithubio-production.up.railway.app/api";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

let selectedKode = null;
let currentKode = null;
let adminToken = localStorage.getItem("adminToken") || "";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken}`
  };
}

function badgeClass(status) {
  if (status === "Diproses") return "badge badge-proses";
  if (status === "Selesai") return "badge badge-selesai";
  if (status === "Ditolak") return "badge badge-tolak";
  return "badge badge-wait";
}

function formatTanggal(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${adminToken}`
    }
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Terjadi kesalahan pada server.");
  }

  return result;
}

async function doLogin() {
  const inputs = document.querySelectorAll("#login-shell .login-input");
  const username = inputs[0]?.value.trim();
  const password = inputs[1]?.value.trim();

  try {
    const response = await fetch(`${API_URL}/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Login gagal.");
    }

    adminToken = result.token;
    localStorage.setItem("adminToken", adminToken);

    $("#login-shell").style.display = "none";
    $("#admin-shell").style.display = "block";

    showAdminPage("dashboard");
    showToast("Berhasil masuk sebagai Admin Polsek Wanasari");
  } catch (error) {
    showToast(error.message);
  }
}

function doLogout() {
  localStorage.removeItem("adminToken");
  adminToken = "";

  $("#admin-shell").style.display = "none";
  $("#login-shell").style.display = "flex";

  showToast("Berhasil keluar dari sistem");
}

function togglePw() {
  const inputPassword = $("#pw-input");
  if (!inputPassword) return;

  inputPassword.type = inputPassword.type === "password" ? "text" : "password";
}

function showAdminPage(name) {
  $$(".admin-page").forEach((page) => page.classList.remove("active"));

  const targetPage = $("#page-" + name);
  if (targetPage) targetPage.classList.add("active");

  const navMap = {
    dashboard: "nav-dashboard",
    data: "nav-data",
    detail: "nav-data",
    kategori: "nav-kategori",
    profil: "nav-profil"
  };

  $$(".nav-item").forEach((nav) => nav.classList.remove("active"));

  const activeNav = $("#" + navMap[name]);
  if (activeNav) activeNav.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (name === "dashboard") loadDashboard();
  if (name === "data") loadDataPengaduan();
}

async function loadDashboard() {
  try {
    const result = await apiFetch("/stats");
    const stats = result.data;

    const values = $$("#page-dashboard .stat-value");

    if (values[0]) values[0].textContent = stats.total;
    if (values[1]) values[1].textContent = stats.menunggu;
    if (values[2]) values[2].textContent = stats.diproses;
    if (values[3]) values[3].textContent = stats.selesai;
    if (values[4]) values[4].textContent = stats.ditolak;

    renderRecentTable(stats.terbaru || []);
    renderTopKategori(stats.topKategori || []);
  } catch (error) {
    showToast(error.message);
  }
}

function renderTopKategori(list) {
  const container = $("#page-dashboard .analytics-row .card:nth-child(2)");
  if (!container) return;

  const max = list[0]?.jumlah || 1;

  container.innerHTML = `
    <div class="card-header"><h3>Top Kategori</h3></div>
    ${
      list.length
        ? list
            .map((item) => {
              const width = Math.max(8, (item.jumlah / max) * 100);
              return `
                <div class="top-kat-item">
                  <div class="top-kat-row">
                    <span>${escapeHTML(item.nama)}</span>
                    <span class="top-kat-count">${item.jumlah}</span>
                  </div>
                  <div class="top-kat-bar">
                    <div class="top-kat-fill" style="width:${width}%;"></div>
                  </div>
                </div>
              `;
            })
            .join("")
        : `<p style="font-size:13px;color:var(--gray-600);">Belum ada laporan.</p>`
    }
  `;
}

function renderRecentTable(list) {
  const tbody = $("#page-dashboard .table-section tbody");
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;color:var(--gray-600);">
          Belum ada pengaduan masuk.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list
    .map(
      (item) => `
      <tr>
        <td class="kode-col">#${escapeHTML(item.kode)}</td>
        <td>${escapeHTML(item.namaLengkap)}</td>
        <td>${escapeHTML(item.kategori)}</td>
        <td>${formatTanggal(item.createdAt)}</td>
        <td><span class="${badgeClass(item.status)}">${escapeHTML(item.status)}</span></td>
        <td>
          <div class="action-icons">
            <button onclick="lihatDetail('${item.kode}')">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");
}

async function loadDataPengaduan() {
  const dataPage = $("#page-data");
  if (!dataPage) return;

  const searchInput = dataPage.querySelector(".filter-input");
  const selects = dataPage.querySelectorAll(".filter-select");

  const q = searchInput?.value.trim() || "";
  const kategori = selects[0]?.value || "Semua Kategori";
  const status = selects[1]?.value || "Semua Status";

  const params = new URLSearchParams();
  if (q) params.append("q", q);
  if (kategori !== "Semua Kategori") params.append("kategori", kategori);
  if (status !== "Semua Status") params.append("status", status);

  try {
    const result = await apiFetch(`/pengaduan?${params.toString()}`);
    renderDataTable(result.data || []);
  } catch (error) {
    showToast(error.message);
  }
}

function renderDataTable(list) {
  const tbody = $("#page-data tbody");
  const paginationText = $("#page-data .pagination-row span");

  if (!tbody) return;

  if (paginationText) {
    paginationText.textContent = `Menampilkan ${list.length} data pengaduan`;
  }

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;color:var(--gray-600);">
          Tidak ada data pengaduan.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list
    .map(
      (item) => `
      <tr>
        <td class="kode-col">#${escapeHTML(item.kode)}</td>
        <td>
          <div class="pelapor-name">${escapeHTML(item.namaLengkap)}</div>
          <div class="pelapor-phone">${escapeHTML(item.noHp)}</div>
        </td>
        <td>${escapeHTML(item.kategori)}</td>
        <td>${escapeHTML(item.lokasi)}</td>
        <td>${formatTanggal(item.createdAt)}</td>
        <td><span class="${badgeClass(item.status)}">${escapeHTML(item.status)}</span></td>
        <td>
          <div class="action-icons">
            <button onclick="lihatDetail('${item.kode}')" title="Lihat Detail">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>

            <button class="red" onclick="openModal('${item.kode}')" title="Hapus">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/>
                <path d="M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");
}

async function lihatDetail(kode) {
  try {
    const response = await fetch(`${API_URL}/pengaduan/${kode}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Detail pengaduan tidak ditemukan.");
    }

    currentKode = kode;
    renderDetail(result.data);
    showAdminPage("detail");
  } catch (error) {
    showToast(error.message);
  }
}

function renderDetail(data) {
  const detailPage = $("#page-detail");
  if (!detailPage) return;

  const kodeBig = detailPage.querySelector(".kode-big");
  const statusBadge = detailPage.querySelector(".detail-header-right .badge");
  const timeLabel = detailPage.querySelector(".time-lbl");
  const values = detailPage.querySelectorAll(".info-item .val");
  const kronologi = detailPage.querySelector(".kronologi-text");
  const buktiGrid = detailPage.querySelector(".bukti-grid");
  const statusSelect = detailPage.querySelector(".tl-select");

  if (kodeBig) kodeBig.textContent = "#" + data.kode;

  if (statusBadge) {
    statusBadge.className = badgeClass(data.status);
    statusBadge.style.fontSize = "13px";
    statusBadge.style.padding = "6px 16px";
    statusBadge.textContent = "● " + data.status;
  }

  if (timeLabel) {
    timeLabel.textContent = "Diterima: " + formatTanggal(data.createdAt);
  }

  if (values[0]) values[0].textContent = data.namaLengkap || "-";
  if (values[1]) values[1].textContent = data.noHp || "-";
  if (values[2]) values[2].textContent = data.alamat || "-";
  if (values[3]) values[3].textContent = data.kategori || "-";
  if (values[4]) values[4].textContent = formatTanggal(data.tanggalKejadian);
  if (values[5]) values[5].textContent = data.lokasi || "-";

  if (kronologi) {
    kronologi.textContent = data.kronologi || "-";
  }

  if (buktiGrid) {
    if (data.bukti && data.bukti.url) {
      buktiGrid.innerHTML = `
        <a class="bukti-item doc" href="${API_BASE}${data.bukti.url}" target="_blank">
          Buka Bukti<br/>
          ${escapeHTML(data.bukti.namaAsli)}
        </a>
      `;
    } else {
      buktiGrid.innerHTML = `
        <div class="bukti-item doc">
          Tidak ada bukti
        </div>
      `;
    }
  }

  if (statusSelect) {
    statusSelect.value = data.status;
  }

  renderRiwayat(data.riwayat || []);
}

function renderRiwayat(riwayat) {
  const card = $(".riwayat-card");
  if (!card) return;

  card.querySelectorAll(".riwayat-item").forEach((item) => item.remove());

  const title = card.querySelector("h4");

  riwayat.forEach((item) => {
    const div = document.createElement("div");
    div.className = "riwayat-item";

    div.innerHTML = `
      <div class="riwayat-dot blue">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </div>
      <div class="riwayat-text">
        <div class="r-title">Status: ${escapeHTML(item.status)}</div>
        <div class="r-sub">${escapeHTML(item.catatan)} • ${formatTanggal(item.waktu)}</div>
      </div>
    `;

    title.insertAdjacentElement("afterend", div);
  });
}

async function simpanTindakLanjut() {
  if (!currentKode) {
    showToast("Pilih data pengaduan terlebih dahulu.");
    return;
  }

  const detailPage = $("#page-detail");
  const statusSelect = detailPage.querySelector(".tl-select");
  const catatan = detailPage.querySelector(".tl-textarea");

  const status = statusSelect.value;
  const catatanAdmin = catatan.value.trim();

  if (!catatanAdmin) {
    showToast("Catatan admin wajib diisi.");
    return;
  }

  try {
    await apiFetch(`/pengaduan/${currentKode}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({
        status,
        catatanAdmin
      })
    });

    catatan.value = "";
    showToast("Status pengaduan berhasil diperbarui.");
    await lihatDetail(currentKode);
    await loadDashboard();
  } catch (error) {
    showToast(error.message);
  }
}

function openModal(kode) {
  selectedKode = kode;

  const modal = $("#delete-modal");
  if (modal) modal.classList.add("open");
}

function closeModal() {
  const modal = $("#delete-modal");
  if (modal) modal.classList.remove("open");
}

async function confirmDelete() {
  if (!selectedKode) {
    showToast("Data belum dipilih.");
    closeModal();
    return;
  }

  try {
    await apiFetch(`/pengaduan/${selectedKode}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    showToast("Data berhasil dihapus.");
    selectedKode = null;
    closeModal();

    await loadDataPengaduan();
    await loadDashboard();
  } catch (error) {
    showToast(error.message);
  }
}

function filterDataPengaduan() {
  loadDataPengaduan();
}

function filterKategori() {
  const kategoriPage = $("#page-kategori");
  if (!kategoriPage) return;

  const searchInput = kategoriPage.querySelector(".search-box");
  const searchValue = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const rows = kategoriPage.querySelectorAll("tbody tr");

  rows.forEach((row) => {
    const rowText = row.innerText.toLowerCase();
    row.style.display = rowText.includes(searchValue) ? "" : "none";
  });
}

function tambahKategori() {
  const namaKategori = prompt("Masukkan nama kategori baru:");

  if (!namaKategori || namaKategori.trim() === "") {
    showToast("Nama kategori tidak boleh kosong.");
    return;
  }

  const kategoriPage = $("#page-kategori");
  const tbody = kategoriPage.querySelector("tbody");
  const jumlahRow = tbody.querySelectorAll("tr").length + 1;

  const row = document.createElement("tr");

  row.innerHTML = `
    <td>${jumlahRow}</td>
    <td>
      <div style="font-weight:700;">${escapeHTML(namaKategori)}</div>
      <div style="font-size:11px;color:var(--gray-600);">Kategori baru</div>
    </td>
    <td style="color:var(--gray-600);">
      Deskripsi kategori ${escapeHTML(namaKategori)} dapat diedit oleh admin.
    </td>
    <td><span class="badge badge-aktif">Aktif</span></td>
    <td>
      <div class="action-icons">
        <button class="red" onclick="this.closest('tr').remove()">
          Hapus
        </button>
      </div>
    </td>
  `;

  tbody.appendChild(row);
  showToast("Kategori baru berhasil ditambahkan.");
}

function simpanProfil() {
  showToast("Profil admin berhasil diperbarui.");
}

function showToast(message) {
  let toast = $("#toast-notification");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-notification";
    toast.style.position = "fixed";
    toast.style.right = "24px";
    toast.style.bottom = "24px";
    toast.style.background = "#0d1117";
    toast.style.color = "#fff";
    toast.style.padding = "12px 18px";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 8px 30px rgba(0,0,0,.25)";
    toast.style.fontSize = "13px";
    toast.style.fontWeight = "600";
    toast.style.zIndex = "9999";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all .25s ease";

    document.body.appendChild(toast);
  }

  toast.textContent = message;

  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  }, 10);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
  }, 2500);
}

document.addEventListener("DOMContentLoaded", () => {
  const deleteModal = $("#delete-modal");

  if (deleteModal) {
    deleteModal.addEventListener("click", function (event) {
      if (event.target === this) closeModal();
    });
  }

  const btnConfirm = $(".btn-confirm");
  if (btnConfirm) {
    btnConfirm.onclick = confirmDelete;
  }

  const dataPage = $("#page-data");

  if (dataPage) {
    const searchInput = dataPage.querySelector(".filter-input");
    const filterSelects = dataPage.querySelectorAll(".filter-select");
    const filterBtn = dataPage.querySelector(".filter-btn");

    if (searchInput) searchInput.addEventListener("keyup", filterDataPengaduan);
    filterSelects.forEach((select) => select.addEventListener("change", filterDataPengaduan));
    if (filterBtn) filterBtn.addEventListener("click", filterDataPengaduan);
  }

  const kategoriPage = $("#page-kategori");

  if (kategoriPage) {
    const kategoriSearch = kategoriPage.querySelector(".search-box");
    const btnTambah = kategoriPage.querySelector(".btn-tambah");
    const btnFilter = kategoriPage.querySelector(".btn-filter");

    if (kategoriSearch) kategoriSearch.addEventListener("keyup", filterKategori);
    if (btnFilter) btnFilter.addEventListener("click", filterKategori);
    if (btnTambah) btnTambah.addEventListener("click", tambahKategori);
  }

  const btnSimpanTindakLanjut = $(".btn-simpan");
  if (btnSimpanTindakLanjut) {
    btnSimpanTindakLanjut.addEventListener("click", simpanTindakLanjut);
  }

  const btnSimpanProfil = $(".btn-simpan-profil");
  if (btnSimpanProfil) {
    btnSimpanProfil.addEventListener("click", simpanProfil);
  }

  if (adminToken) {
    $("#login-shell").style.display = "none";
    $("#admin-shell").style.display = "block";
    showAdminPage("dashboard");
  }
});

// ======================================================
// PATCH ADMIN INTERAKTIF: KATEGORI + PROFIL + LIHAT SANDI
// Tempel di PALING BAWAH admin/script.js
// ======================================================

(() => {
  const qs = (selector, parent = document) => parent.querySelector(selector);
  const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  const KATEGORI_KEY = "adminKategoriPengaduan";
  const PROFIL_KEY = "adminProfilData";

  function toast(message) {
    if (typeof showToast === "function") {
      showToast(message);
      return;
    }

    alert(message);
  }

  function escapeText(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ======================================================
  // MODAL KATEGORI
  // ======================================================

  function injectKategoriModal() {
    if (qs("#kategori-modal-admin")) return;

    const style = document.createElement("style");
    style.textContent = `
      .kategori-modal-admin {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.45);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 99999;
      }

      .kategori-modal-admin.open {
        display: flex;
      }

      .kategori-modal-box {
        width: 460px;
        max-width: calc(100% - 32px);
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 20px 70px rgba(0,0,0,.25);
        padding: 24px;
      }

      .kategori-modal-box h3 {
        font-size: 18px;
        font-weight: 800;
        margin-bottom: 18px;
        color: #0d1117;
      }

      .kategori-form-group {
        margin-bottom: 14px;
      }

      .kategori-form-group label {
        display: block;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 6px;
        color: #343a40;
      }

      .kategori-form-group input,
      .kategori-form-group textarea,
      .kategori-form-group select {
        width: 100%;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 13px;
        font-family: inherit;
        outline: none;
      }

      .kategori-form-group textarea {
        min-height: 90px;
        resize: vertical;
      }

      .kategori-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 18px;
      }

      .kategori-btn-cancel,
      .kategori-btn-save {
        border: none;
        border-radius: 8px;
        padding: 10px 18px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }

      .kategori-btn-cancel {
        background: #f1f3f5;
        color: #343a40;
      }

      .kategori-btn-save {
        background: #0d1117;
        color: #fff;
      }

      .password-field-wrap {
        position: relative;
      }

      .password-field-wrap input {
        padding-right: 70px !important;
      }

      .toggle-profile-password {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        border: none;
        background: #eef2ff;
        color: #1a237e;
        border-radius: 6px;
        padding: 5px 8px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }
    `;

    document.head.appendChild(style);

    const modal = document.createElement("div");
    modal.id = "kategori-modal-admin";
    modal.className = "kategori-modal-admin";

    modal.innerHTML = `
      <div class="kategori-modal-box">
        <h3 id="kategori-modal-title">Tambah Kategori</h3>

        <div class="kategori-form-group">
          <label>Nama Kategori</label>
          <input type="text" id="kategori-input-nama" placeholder="Contoh: Kehilangan Barang">
        </div>

        <div class="kategori-form-group">
          <label>Subjudul</label>
          <input type="text" id="kategori-input-sub" placeholder="Contoh: Pelaporan barang hilang/tercecer">
        </div>

        <div class="kategori-form-group">
          <label>Deskripsi</label>
          <textarea id="kategori-input-deskripsi" placeholder="Masukkan deskripsi kategori"></textarea>
        </div>

        <div class="kategori-form-group">
          <label>Status</label>
          <select id="kategori-input-status">
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </select>
        </div>

        <div class="kategori-modal-actions">
          <button type="button" class="kategori-btn-cancel" id="kategori-btn-cancel">Batal</button>
          <button type="button" class="kategori-btn-save" id="kategori-btn-save">Simpan</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    qs("#kategori-btn-cancel").addEventListener("click", closeKategoriModal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeKategoriModal();
    });
  }

  let kategoriEditIndex = null;

  function openKategoriModal(mode, index = null) {
    injectKategoriModal();

    const modal = qs("#kategori-modal-admin");
    const title = qs("#kategori-modal-title");

    const namaInput = qs("#kategori-input-nama");
    const subInput = qs("#kategori-input-sub");
    const deskripsiInput = qs("#kategori-input-deskripsi");
    const statusInput = qs("#kategori-input-status");
    const saveBtn = qs("#kategori-btn-save");

    kategoriEditIndex = index;

    if (mode === "edit") {
      const data = getKategoriData()[index];

      title.textContent = "Edit Kategori";
      namaInput.value = data.nama || "";
      subInput.value = data.sub || "";
      deskripsiInput.value = data.deskripsi || "";
      statusInput.value = data.status || "Aktif";
    } else {
      title.textContent = "Tambah Kategori";
      namaInput.value = "";
      subInput.value = "";
      deskripsiInput.value = "";
      statusInput.value = "Aktif";
    }

    saveBtn.onclick = saveKategoriFromModal;

    modal.classList.add("open");
    setTimeout(() => namaInput.focus(), 50);
  }

  function closeKategoriModal() {
    const modal = qs("#kategori-modal-admin");
    if (modal) modal.classList.remove("open");
    kategoriEditIndex = null;
  }

  function getInitialKategoriFromTable() {
    const kategoriPage = qs("#page-kategori");
    if (!kategoriPage) return [];

    const rows = qsa("tbody tr", kategoriPage);

    return rows.map((row) => {
      const cells = row.querySelectorAll("td");

      const nama = cells[1]?.querySelector("div:first-child")?.textContent.trim() || "";
      const sub = cells[1]?.querySelector("div:nth-child(2)")?.textContent.trim() || "";
      const deskripsi = cells[2]?.textContent.trim() || "";
      const statusText = cells[3]?.textContent.trim().toLowerCase() || "aktif";

      return {
        nama,
        sub,
        deskripsi,
        status: statusText.includes("nonaktif") ? "Nonaktif" : "Aktif"
      };
    }).filter((item) => item.nama);
  }

  function getKategoriData() {
    const saved = localStorage.getItem(KATEGORI_KEY);

    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }

    const initialData = getInitialKategoriFromTable();

    if (initialData.length) {
      localStorage.setItem(KATEGORI_KEY, JSON.stringify(initialData));
    }

    return initialData;
  }

  function setKategoriData(data) {
    localStorage.setItem(KATEGORI_KEY, JSON.stringify(data));
  }

  function saveKategoriFromModal() {
    const nama = qs("#kategori-input-nama").value.trim();
    const sub = qs("#kategori-input-sub").value.trim();
    const deskripsi = qs("#kategori-input-deskripsi").value.trim();
    const status = qs("#kategori-input-status").value;

    if (!nama) {
      toast("Nama kategori wajib diisi");
      return;
    }

    if (!deskripsi) {
      toast("Deskripsi kategori wajib diisi");
      return;
    }

    const data = getKategoriData();

    const item = {
      nama,
      sub: sub || "Kategori pengaduan masyarakat",
      deskripsi,
      status
    };

    if (kategoriEditIndex === null) {
      data.push(item);
      toast("Kategori berhasil ditambahkan");
    } else {
      data[kategoriEditIndex] = item;
      toast("Kategori berhasil diperbarui");
    }

    setKategoriData(data);
    renderKategoriTable();
    closeKategoriModal();
  }

  function renderKategoriTable() {
    const kategoriPage = qs("#page-kategori");
    if (!kategoriPage) return;

    const tbody = qs("tbody", kategoriPage);
    if (!tbody) return;

    const data = getKategoriData();

    tbody.innerHTML = data.map((item, index) => `
      <tr data-index="${index}">
        <td>${index + 1}</td>

        <td>
          <div style="font-weight:700;">${escapeText(item.nama)}</div>
          <div style="font-size:11px;color:var(--gray-600);">${escapeText(item.sub)}</div>
        </td>

        <td style="color:var(--gray-600);">${escapeText(item.deskripsi)}</td>

        <td>
          <span class="badge ${item.status === "Aktif" ? "badge-aktif" : "badge-nonaktif"}">
            ${escapeText(item.status)}
          </span>
        </td>

        <td>
          <div class="action-icons">
            <button class="gray btn-edit-kategori" type="button" title="Edit kategori">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>

            <button class="red btn-delete-kategori" type="button" title="Hapus kategori">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join("");

    updateKategoriStats();
    filterKategoriTable();
  }

  function updateKategoriStats() {
    const kategoriPage = qs("#page-kategori");
    if (!kategoriPage) return;

    const data = getKategoriData();
    const total = data.length;
    const aktif = data.filter((item) => item.status === "Aktif").length;

    const values = qsa(".kat-stat-card .ks-value", kategoriPage);

    if (values[0]) values[0].textContent = total;
    if (values[1]) values[1].textContent = aktif;

    if (values[2]) {
      values[2].textContent = data[0]?.nama || "-";
    }

    const paginationText = qs(".pagination-row span", kategoriPage);
    if (paginationText) {
      paginationText.textContent = `Menampilkan 1-${Math.min(total, 5)} dari ${total} kategori`;
    }
  }

  function filterKategoriTable() {
    const kategoriPage = qs("#page-kategori");
    if (!kategoriPage) return;

    const keyword = qs(".search-box", kategoriPage)?.value.toLowerCase().trim() || "";

    qsa("tbody tr", kategoriPage).forEach((row) => {
      row.style.display = row.innerText.toLowerCase().includes(keyword) ? "" : "none";
    });
  }

  function deleteKategori(index) {
    const data = getKategoriData();
    const nama = data[index]?.nama || "kategori ini";

    const yakin = confirm(`Hapus kategori "${nama}"?`);
    if (!yakin) return;

    data.splice(index, 1);
    setKategoriData(data);
    renderKategoriTable();

    toast("Kategori berhasil dihapus");
  }

  function setupKategoriPage() {
    const kategoriPage = qs("#page-kategori");
    if (!kategoriPage) return;

    injectKategoriModal();

    renderKategoriTable();

    const oldTambahBtn = qs(".btn-tambah", kategoriPage);
    if (oldTambahBtn) {
      const newTambahBtn = oldTambahBtn.cloneNode(true);
      oldTambahBtn.replaceWith(newTambahBtn);

      newTambahBtn.addEventListener("click", () => {
        openKategoriModal("add");
      });
    }

    const searchBox = qs(".search-box", kategoriPage);
    if (searchBox) {
      searchBox.addEventListener("input", filterKategoriTable);
      searchBox.addEventListener("keyup", filterKategoriTable);
    }

    const filterBtn = qs(".btn-filter", kategoriPage);
    if (filterBtn) {
      filterBtn.addEventListener("click", filterKategoriTable);
    }

    kategoriPage.addEventListener("click", (event) => {
      const editBtn = event.target.closest(".btn-edit-kategori");
      const deleteBtn = event.target.closest(".btn-delete-kategori");

      if (editBtn) {
        event.preventDefault();
        const row = editBtn.closest("tr");
        const index = Number(row.dataset.index);
        openKategoriModal("edit", index);
      }

      if (deleteBtn) {
        event.preventDefault();
        const row = deleteBtn.closest("tr");
        const index = Number(row.dataset.index);
        deleteKategori(index);
      }
    });
  }

  // ======================================================
  // PROFIL ADMIN
  // ======================================================

  function clearFakePasswordBullets(input) {
    if (!input) return;

    if (input.value.includes("•")) {
      input.value = "";
      input.placeholder = "••••••••";
    }
  }

  function setupPasswordToggle() {
    const profilPage = qs("#page-profil");
    if (!profilPage) return;

    const passwordInputs = qsa('.settings-card input[type="password"]', profilPage);

    passwordInputs.forEach((input) => {
      clearFakePasswordBullets(input);

      const group = input.closest(".s-group");
      if (!group) return;

      if (group.classList.contains("password-field-wrap")) return;

      group.classList.add("password-field-wrap");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "toggle-profile-password";
      btn.textContent = "Lihat";

      btn.addEventListener("click", () => {
        const isHidden = input.type === "password";
        input.type = isHidden ? "text" : "password";
        btn.textContent = isHidden ? "Tutup" : "Lihat";
      });

      group.appendChild(btn);
    });
  }

  function saveProfilAdmin() {
    const profilPage = qs("#page-profil");
    if (!profilPage) return;

    const inputs = qsa(".settings-card input", profilPage);

    const namaLengkap = inputs[0]?.value.trim();
    const username = inputs[1]?.value.trim();
    const sandiLama = inputs[2]?.value.trim();
    const sandiBaru = inputs[3]?.value.trim();
    const konfirmasiSandi = inputs[4]?.value.trim();

    if (!namaLengkap) {
      toast("Nama lengkap wajib diisi");
      return;
    }

    if (!username) {
      toast("Username wajib diisi");
      return;
    }

    const ubahSandi = sandiLama || sandiBaru || konfirmasiSandi;

    if (ubahSandi && !sandiLama) {
      toast("Kata sandi lama wajib diisi jika ingin mengubah kata sandi");
      return;
    }

    if (ubahSandi && !sandiBaru) {
      toast("Kata sandi baru wajib diisi");
      return;
    }

    if (ubahSandi && sandiBaru !== konfirmasiSandi) {
      toast("Konfirmasi kata sandi baru tidak sesuai");
      return;
    }

    qs(".profil-name", profilPage).textContent = namaLengkap;
    qs(".profil-handle", profilPage).textContent = username;

    qsa(".admin-info .name").forEach((el) => {
      el.textContent = namaLengkap;
    });

    localStorage.setItem(PROFIL_KEY, JSON.stringify({
      namaLengkap,
      username,
      updatedAt: new Date().toISOString()
    }));

    if (ubahSandi) {
      inputs[2].value = "";
      inputs[3].value = "";
      inputs[4].value = "";

      toast("Profil dan kata sandi berhasil diperbarui");
    } else {
      toast("Profil admin berhasil diperbarui");
    }
  }

  function loadProfilAdminPatch() {
    const profilPage = qs("#page-profil");
    if (!profilPage) return;

    const saved = localStorage.getItem(PROFIL_KEY);
    if (!saved) return;

    try {
      const data = JSON.parse(saved);
      const inputs = qsa(".settings-card input", profilPage);

      if (inputs[0]) inputs[0].value = data.namaLengkap || "";
      if (inputs[1]) inputs[1].value = data.username || "";

      qs(".profil-name", profilPage).textContent = data.namaLengkap || "Admin";
      qs(".profil-handle", profilPage).textContent = data.username || "@admin";

      qsa(".admin-info .name").forEach((el) => {
        el.textContent = data.namaLengkap || "Admin";
      });
    } catch {
      localStorage.removeItem(PROFIL_KEY);
    }
  }

  function setupProfilPage() {
    const profilPage = qs("#page-profil");
    if (!profilPage) return;

    setupPasswordToggle();
    loadProfilAdminPatch();

    const oldSaveBtn = qs(".btn-simpan-profil", profilPage);

    if (oldSaveBtn) {
      const newSaveBtn = oldSaveBtn.cloneNode(true);
      oldSaveBtn.replaceWith(newSaveBtn);

      newSaveBtn.addEventListener("click", (event) => {
        event.preventDefault();
        saveProfilAdmin();
      });
    }
  }

  // ======================================================
  // INIT PATCH
  // ======================================================

  document.addEventListener("DOMContentLoaded", () => {
    setupKategoriPage();
    setupProfilPage();
  });
})();
