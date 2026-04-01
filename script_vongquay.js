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

// 3. LẮNG NGHE LỊCH SỬ TỪ FIREBASE (Thay thế loadHistory cũ)
// Thêm hàm này để bọc các lệnh liên quan đến Firebase
function initFirebaseLogic() {
    if (!window.db) return;

    // LẮNG NGHE LỊCH SỬ TỪ FIREBASE
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
}

// Chạy logic khi Firebase đã sẵn sàng hoặc chạy ngay nếu đã có sẵn
if (window.db) {
    initFirebaseLogic();
} else {
    window.addEventListener('firebase-ready', initFirebaseLogic);
}
// 4. LOGIC QUAY & LƯU FIREBASE
spinBtn.addEventListener('click', function() {
    const name = nameInput.value.trim().toUpperCase();
    if (!name) return alert("Vui lòng nhập tên Ingame!");

    // Chống quay lại bằng cách check trên Firebase
    window.dbOnValue(window.dbRef(window.db, 'wheelHistory'), (snapshot) => {
        const data = snapshot.val();
        let hasPlayed = false;
        if (data) {
            hasPlayed = Object.values(data).some(item => item.name.toUpperCase() === name);
        }

        if (hasPlayed) {
            alert("Nhân vật này đã tham gia quay tuần này rồi!");
        } else {
            startSpinAction(name);
        }
    }, { onlyOnce: true });
});

function startSpinAction(name) {
    spinBtn.disabled = true;
    nameInput.disabled = true;
    resultText.innerText = "Đang quay...";

    // Tính toán trúng thưởng
    let r = Math.random() * 100;
    let acc = 0;
    let winIdx = prizes.length - 1;
    for (let i = 0; i < prizes.length; i++) {
        acc += prizes[i].chance;
        if (r <= acc) { winIdx = i; break; }
    }

    const rotations = 10;
    let angleBeforeWin = 0;
    for(let i = 0; i < winIdx; i++) {
        angleBeforeWin += (prizes[i].chance / 100) * 2 * Math.PI;
    }
    const prizeArc = (prizes[winIdx].chance / 100) * 2 * Math.PI;
    const finalAngle = (Math.PI * 1.5) - angleBeforeWin - (prizeArc / 2);
    const totalRotation = (rotations * 2 * Math.PI) + (finalAngle - (startAngle % (2 * Math.PI)));

    let startTimestamp = null;
    const duration = 5000;
    const initialAngle = startAngle;

    function animate(now) {
        if (!startTimestamp) startTimestamp = now;
        let elapsed = now - startTimestamp;
        let progress = Math.min(elapsed / duration, 1);
        let ease = 1 - Math.pow(1 - progress, 4);
        startAngle = initialAngle + (totalRotation * ease);
        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            const resultValue = prizes[winIdx].text;
            resultText.innerHTML = `<span style="color:#fffa65">🎁 TRÚNG:</span> ${resultValue}`;
            
            // LƯU LÊN FIREBASE
            const nowTime = new Date();
            const timeStr = `${nowTime.getHours()}:${nowTime.getMinutes().toString().padStart(2, '0')}`;
            
            const historyRef = window.dbRef(window.db, 'wheelHistory');
            window.dbPush(historyRef, {
                name: name,
                prize: resultValue,
                time: timeStr
            });
            
            spinBtn.disabled = false;
            nameInput.disabled = false;
        }
    }
    requestAnimationFrame(animate);
}

// 5. ADMIN RESET (Firebase)
const confirmReset = document.getElementById('confirm-reset');
if(confirmReset) {
    confirmReset.onclick = () => {
        if (prompt("Nhập PIN Admin:") === "171102") {
            window.dbRemove(window.dbRef(window.db, 'wheelHistory')).then(() => {
                alert("Đã xóa lịch sử vòng quay!");
                location.reload();
            });
        }
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