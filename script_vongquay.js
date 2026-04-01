const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
const resultText = document.getElementById('result-text');
const nameInput = document.getElementById('username');
const historyBody = document.getElementById('history-body');

// 1. DỮ LIỆU PHẦN THƯỞNG (Giữ nguyên tỉ lệ của bạn)
const prizes = [
    { text: "2000 GOLD", color: "#FF1493", chance: 3 },
    { text: "50 Mảnh B2", color: "#4B0082", chance: 17 },
    { text: "1000 GOLD", color: "#FFD700", chance: 7 },
    { text: "300 GOLD", color: "#00FF7F", chance: 15 },
    { text: "1500 GOLD", color: "#FF4500", chance: 6 },
    { text: "500K NGỌC", color: "#1E90FF", chance: 15 },
    { text: "1.5M NGỌC", color: "#FFB6C1", chance: 7 },
    { text: "500 GOLD", color: "#20B2AA", chance: 10 },
    { text: "1M NGỌC", color: "#2F4F4F", chance: 10 },
    { text: "2M NGỌC", color: "#FF8C00", chance: 10 }
];

let startAngle = 0;
canvas.width = 500;
canvas.height = 500;
const centerX = 250;
const centerY = 250;
const radius = 240;

// 2. VẼ VÒNG QUAY
function drawWheel() {
    let currentAngle = startAngle;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    prizes.forEach((p) => {
        const segAngle = (p.chance / 100) * (Math.PI * 2);
        
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + segAngle, false);
        ctx.lineTo(centerX, centerY);
        ctx.fill();
        
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.fillStyle = "white";
        ctx.font = 'bold 14px Arial';
        ctx.translate(centerX, centerY);
        ctx.rotate(currentAngle + segAngle / 2);
        ctx.translate(radius * 0.55, 0); 
        ctx.fillText(p.text, 0, 5); 
        ctx.restore();

        currentAngle += segAngle;
    });
}

// --- GIỮ NGUYÊN PHẦN 1 VÀ 2 (Khai báo biến và drawWheel) ---

function initGame() {
    // 3. LẮNG NGHE LỊCH SỬ TỪ FIREBASE
    window.dbOnValue(window.dbRef(window.db, 'wheelHistory'), (snapshot) => {
        const data = snapshot.val();
        if (!historyBody) return;
        historyBody.innerHTML = "";
        if (data) {
            const list = Object.values(data).reverse().slice(0, 10);
            historyBody.innerHTML = list.map(i => `
                <tr>
                    <td style="color: #888; font-size: 0.8rem;">${i.time}</td>
                    <td style="color: #fffa65; font-weight: bold;">${i.name}</td>
                    <td style="color: #fff; font-weight: bold;">${i.prize}</td>
                </tr>
            `).join('');
        } else {
            historyBody.innerHTML = "<tr><td colspan='3'>Chưa có lượt quay nào!</td></tr>";
        }
    });

    // 4. LOGIC QUAY & LƯU FIREBASE
    spinBtn.addEventListener('click', function() {
        const name = nameInput.value.trim().toUpperCase();
        if (!name) return alert("Vui lòng nhập tên Ingame!");

        spinBtn.disabled = true;

        window.dbOnValue(window.dbRef(window.db, 'wheelHistory'), (snapshot) => {
            const data = snapshot.val();
            let hasPlayed = false;
            if (data) {
                hasPlayed = Object.values(data).some(item => item.name && item.name.toUpperCase() === name);
            }

            if (hasPlayed) {
                alert("Nhân vật này đã tham gia quay tuần này rồi!");
                spinBtn.disabled = false;
            } else {
                startSpinAction(name);
            }
        }, { onlyOnce: true });
    });
}

// SỬA CHỖ NÀY: Đợi Firebase sẵn sàng mới chạy logic
if (window.db) {
    initGame();
} else {
    window.addEventListener('firebase-ready', initGame);
}

// --- GIỮ NGUYÊN CÁC PHẦN CÒN LẠI (startSpinAction, Admin Reset, displayPrizeList) ---
drawWheel();
// 5. ADMIN RESET (Firebase)
const ADMIN_PIN = "171102"; // Mã PIN bạn đã đặt

window.addEventListener('keydown', (e) => {
    // Nhấn phím 'A' để mở bảng điều khiển (khớp với hint "Nhấn 'A' để quản lý" trong HTML)
    if (e.key.toLowerCase() === '?') { 
        if (prompt("Nhập PIN Admin để mở trình quản lý:") === ADMIN_PIN) {
            const adminModal = document.getElementById('admin-modal');
            if (adminModal) {
                adminModal.style.display = 'flex'; // Hiển thị Modal
            }
        }
    }
});

// Xử lý nút Reset trong Modal
const confirmResetBtn = document.getElementById('confirm-reset');
if (confirmResetBtn) {
    confirmResetBtn.addEventListener('click', () => {
        if (confirm("Xác nhận reset toàn bộ lịch sử vòng quay trên Firebase?")) {
            // Chú ý: Dùng đúng đường dẫn 'wheelHistory' của vòng quay
            window.dbRemove(window.dbRef(window.db, 'wheelHistory')).then(() => {
                alert("Đã xóa sạch lịch sử!");
                location.reload();
            }).catch(err => {
                alert("Lỗi: " + err.message);
            });
        }
    });
}

// Nút đóng Modal
const closeModalBtn = document.getElementById('close-modal');
if (closeModalBtn) {
    closeModalBtn.onclick = () => {
        document.getElementById('admin-modal').style.display = 'none';
    };
}

// Hiển thị danh sách quà bên phải
(function displayPrizeList() {
    const list = document.getElementById('prize-list-display');
    if (!list) return;
    list.innerHTML = prizes.map(p => `
        <li style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05)">
            <span style="color: #fff;">${p.text}</span>
            <span style="color: #fffa65; font-weight: bold;">${p.chance}%</span>
        </li>
    `).join('');
})();

drawWheel();