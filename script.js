// ==========================================
// 1. SET YOUR PRODUCTION BACKEND URL HERE 
// ==========================================
// After you deploy your backend to Render.com, copy the URL and paste it here.
const PRODUCTION_API_URL = "https://crop-yield-prediction-yjla.onrender.com";

// Automatically detect environment
const isLocal = window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "";

const API = isLocal
    ? (window.location.port === "8000" ? "" : "http://127.0.0.1:8000")
    : PRODUCTION_API_URL;

/**
 * Helper to handle fetch errors with better diagnostics and Auto-Retry for cold starts
 */
async function safeFetch(url, options = {}, retries = 3) {
    if (!isLocal && !PRODUCTION_API_URL) {
        alert("Action Required: Please set your PRODUCTION_API_URL in script.js.");
        throw new Error("Missing Backend URL");
    }

    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || `Server error: ${res.status}`);
            }
            return res;
        } catch (e) {
            console.warn(`Attempt ${i + 1} failed:`, e);

            // If it's a timeout or connection error in production, retry
            if (!isLocal && i < retries - 1) {
                console.log("Retrying... (Backend might be waking up)");
                await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
                continue;
            }

            let errorMsg = isLocal
                ? "❌ LOCAL ERROR: Make sure run_app.bat is running."
                : `❌ BACKEND ERROR: Could not reach the server.\n\nYour Render backend is likely "sleeping". \nPlease refresh the page in 30 seconds.`;

            alert(errorMsg);
            throw e;
        }
    }
}

// ---------------------------------------------------------
// AUTHENTICATION FUNCTIONS
// ---------------------------------------------------------

async function signup() {
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please fill all fields");
        return;
    }

    try {
        let res = await safeFetch(`${API}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        let data = await res.json();
        alert(data.message);
        if (data.status === "success") {
            window.location.href = "login.html";
        }
    } catch (e) {
        console.error("Signup failed", e);
    }
}

async function login() {
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please fill all fields");
        return;
    }

    try {
        let res = await safeFetch(`${API}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        let data = await res.json();
        if (data.status === "success") {
            window.location.href = "dashboard.html";
        } else {
            alert(data.message);
        }
    } catch (e) {
        console.error("Login failed", e);
    }
}

// ---------------------------------------------------------
// PREDICTION FUNCTIONS
// ---------------------------------------------------------

async function loadOptions() {
    let areaSelect = document.getElementById("area");
    let itemSelect = document.getElementById("item");

    if (!areaSelect || !itemSelect) return;

    try {
        let res = await safeFetch(`${API}/config`);
        let data = await res.json();

        if (!data.areas || !data.items || data.areas.length === 0) {
            console.warn("Backend loaded but returned no data. Check CSV paths.");
            return;
        }

        areaSelect.innerHTML = "";
        itemSelect.innerHTML = "";

        data.areas.forEach(area => {
            let opt = document.createElement("option");
            opt.value = area;
            opt.innerText = area;
            areaSelect.appendChild(opt);
        });

        data.items.forEach(item => {
            let opt = document.createElement("option");
            opt.value = item;
            opt.innerText = item;
            itemSelect.appendChild(opt);
        });

    } catch (e) {
        console.error("Failed to load options", e);
    }
}

async function predict() {
    let area = document.getElementById("area").value;
    let item = document.getElementById("item").value;
    let year = document.getElementById("year").value;
    let rainfall = document.getElementById("rainfall").value;
    let pesticides = document.getElementById("pesticides").value;
    let temp = document.getElementById("temp").value;

    try {
        let res = await safeFetch(`${API}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                area, item, year, rainfall, pesticides, temp
            })
        });

        let data = await res.json();
        if (res.ok) {
            localStorage.setItem("lastPrediction", JSON.stringify({
                input: { area, item, year, rainfall, pesticides, temp },
                result: data.prediction
            }));
            window.location.href = "analysis.html";
        }
    } catch (e) {
        console.error("Prediction failed", e);
    }
}

// ---------------------------------------------------------
// ANALYSIS & VISUALIZATION
// ---------------------------------------------------------

function loadAnalysis() {
    let rawData = localStorage.getItem("lastPrediction");
    if (!rawData) {
        document.getElementById("prediction-value").innerText = "No Data Found";
        return;
    }

    let data = JSON.parse(rawData);
    document.getElementById("prediction-value").innerText = data.result.toFixed(2) + " hg/ha";
    document.getElementById("prediction-details").innerText = `Prediction for ${data.input.item} in ${data.input.area} (${data.input.year})`;

    renderCharts(data.input);
}

function renderCharts(input) {
    const ctxBar = document.getElementById('barChart').getContext('2d');
    new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Rainfall (mm)', 'Pesticides (tn)', 'Temp (°C)'],
            datasets: [{
                label: 'Your Input',
                data: [input.rainfall, input.pesticides, input.temp],
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1
            }, {
                label: 'Global Average',
                data: [1500, 100, 20],
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });

    const ctxPie = document.getElementById('pieChart').getContext('2d');
    new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Rainfall Impact', 'Pesticide Impact', 'Temp Impact', 'Soil/Other'],
            datasets: [{
                data: [40, 25, 20, 15],
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}
