// Configuration
// PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
const API_URL = "https://script.google.com/macros/s/AKfycbzzLClvFDsXlovOinbHyJN6yvXP9tmh4W8OQM5uZiA9VAfhMYYP5JjcCmxeWQ8hmHKd/exec";

// Elements
const scannerContainer = "reader";
const notification = document.getElementById('notification');
const notificationMsg = document.getElementById('notification-msg');

const modal = document.getElementById('ticket-modal');
const ticketDesign = document.getElementById('ticket-design');
const ticketClass = document.getElementById('ticket-class');
const ticketSeat = document.getElementById('ticket-seat');
const ticketName = document.getElementById('ticket-name');
const ticketId = document.getElementById('ticket-id');
const scannedWarning = document.getElementById('scanned-warning');
const firstScanTime = document.getElementById('first-scan-time');
const printTimestamp = document.getElementById('print-timestamp');

let currentTicketId = null;
let html5QrcodeScanner = null;

// Audio
const beepSound = new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_2d00465249.mp3"); // Simple beep

// Initialize Scanner
function startScanner() {
    html5QrcodeScanner = new Html5QrcodeScanner(
        scannerContainer,
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        /* verbose= */ false
    );
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function onScanSuccess(decodedText, decodedResult) {
    if (currentTicketId === decodedText) return; // Prevent double scan of same code rapidly

    // Play sound
    beepSound.play().catch(e => console.log("Audio play failed", e));

    // Stop scanning temporarily or just pause logic? 
    // Usually better to pause to prevent multiple hits while modal is open.
    html5QrcodeScanner.clear();

    // Fetch Data
    fetchTicket(decodedText);
}

function onScanFailure(error) {
    // frequent, ignore
}

// Fetch Logic
async function fetchTicket(id) {
    showNotification("Memproses Tiket ID: " + id + "...", "blue");

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "scan", id: id })
        });

        const result = await response.json();

        if (result.status === "success") {
            currentTicketId = id;
            showNotification("Scan Berhasil!", "green");
            openModal(result.data, result.message === "Ticket already used");
        } else {
            showNotification("Error: " + result.message, "red");
            // Restart scanner after error
            setTimeout(startScanner, 2000);
        }

    } catch (err) {
        console.error(err);
        showNotification("Gagal menghubungi server.", "red");
        setTimeout(startScanner, 2000);
    }
}

// UI Logic
function openModal(data, isAlreadyScanned) {
    // Populate Data
    ticketName.textContent = data.nama;
    ticketClass.textContent = data.kelas;
    ticketSeat.textContent = data.seat ? data.seat : "Free Seating";
    ticketId.textContent = data.id;

    // Reset Classes
    ticketDesign.classList.remove('ticket-vip', 'ticket-reguler');

    // Apply Styling
    if (data.kelas.toLowerCase().includes("vip")) {
        ticketDesign.classList.add('ticket-vip');
    } else {
        ticketDesign.classList.add('ticket-reguler');
    }

    // Warning Logic
    if (isAlreadyScanned) {
        scannedWarning.classList.remove('hidden');
        firstScanTime.textContent = data.scanned_at;
    } else {
        scannedWarning.classList.add('hidden');
    }

    // Show Modal
    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
    currentTicketId = null;
    startScanner(); // Restart scanner
}

function showNotification(msg, color) {
    notificationMsg.innerText = msg;
    notification.className = `mt-4 px-4 py-3 rounded relative w-full max-w-md bg-${color}-100 border border-${color}-400 text-${color}-700`;
    notification.classList.remove('hidden');

    // Auto hide after 3 seconds
    if (color !== 'blue') { // Keep blue (processing) until done
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

// Print Logic
async function printTicket() {
    // 1. Update backend
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "print", id: ticketId.textContent })
        });
        const result = await response.json();

        if (result.status === "success") {
            printTimestamp.textContent = result.printed_at;
        } else {
            printTimestamp.textContent = new Date().toLocaleString(); // Fallback
        }
    } catch (e) {
        printTimestamp.textContent = new Date().toLocaleString(); // Fallback
    }

    // 2. Window Print
    window.print();
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    startScanner();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(req => console.log('Service Worker Registered!'))
            .catch(err => console.log('Service Worker registration failed', err));
    }
});
