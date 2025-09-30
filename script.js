class AttendanceSystem {
    constructor() {
        this.attendanceData = [];
        this.initializeEventListeners();
        this.loadAttendanceData();
    }

    initializeEventListeners() {
        // Navigation
        document.getElementById('studentBtn').addEventListener('click', () => this.showSection('student'));
        document.getElementById('teacherBtn').addEventListener('click', () => this.showSection('teacher'));

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // QR Generator
        document.getElementById('generateQR').addEventListener('click', () => this.generateQRCode());

        // Filters
        document.getElementById('filterCourse').addEventListener('change', () => this.displayAttendance());
        document.getElementById('filterDate').addEventListener('change', () => this.displayAttendance());

        // Export
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToCSV());
    }

    showSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(section + 'Btn').classList.add('active');

        // Update sections
        document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(section + 'Section').classList.add('active');
    }

    markAttendance(e) {
        e.preventDefault();
        
        const studentId = document.getElementById('studentId').value;
        const studentName = document.getElementById('studentName').value;
        const course = document.getElementById('course').value;
        const timestamp = new Date();

        // Check if already marked today
        const today = timestamp.toDateString();
        const alreadyMarked = this.attendanceData.some(record => 
            record.studentId === studentId && 
            record.course === course && 
            new Date(record.timestamp).toDateString() === today
        );

        if (alreadyMarked) {
            this.showMessage('Attendance already marked for today!', 'error');
            return;
        }

        const attendanceRecord = {
            id: Date.now(),
            studentId,
            studentName,
            course,
            timestamp: timestamp.toISOString(),
            status: 'Present'
        };

        this.attendanceData.push(attendanceRecord);
        this.saveData();
        this.displayAttendance();
        
        // Reset form and show success
        document.getElementById('attendanceForm').reset();
        this.showMessage('Attendance marked successfully!', 'success');
    }

    displayAttendance() {
        const filterCourse = document.getElementById('filterCourse').value;
        const filterDate = document.getElementById('filterDate').value;
        const attendanceList = document.getElementById('attendanceList');

        let filteredData = this.attendanceData;

        // Apply filters
        if (filterCourse) {
            filteredData = filteredData.filter(record => record.course === filterCourse);
        }

        if (filterDate) {
            filteredData = filteredData.filter(record => 
                new Date(record.timestamp).toDateString() === new Date(filterDate).toDateString()
            );
        }

        // Sort by timestamp (newest first)
        filteredData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (filteredData.length === 0) {
            attendanceList.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 50px;">No attendance records found.</p>';
            return;
        }

        attendanceList.innerHTML = filteredData.map(record => {
            const date = new Date(record.timestamp);
            return `
                <div class="attendance-record">
                    <div class="record-info">
                        <h4><i class="fas fa-user"></i> ${record.studentName}</h4>
                        <p><i class="fas fa-id-card"></i> ID: ${record.studentId}</p>
                        <p><i class="fas fa-book"></i> ${this.getCourseFullName(record.course)}</p>
                        <p><i class="fas fa-calendar"></i> ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}</p>
                    </div>
                    <div class="record-status">
                        <span class="status-badge">Present</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    getCourseFullName(courseCode) {
        const courses = {
            'BCA': '💻 BCA (Bachelor of Computer Applications)',
            'BBA': '💼 BBA (Bachelor of Business Administration)'
        };
        return courses[courseCode] || courseCode;
    }

    exportToCSV() {
        if (this.attendanceData.length === 0) {
            this.showMessage('No data to export!', 'error');
            return;
        }

        const headers = ['Student ID', 'Student Name', 'Course', 'Date', 'Time', 'Status'];
        const csvContent = [
            headers.join(','),
            ...this.attendanceData.map(record => [
                record.studentId,
                record.studentName,
                record.course,
                new Date(record.timestamp).toLocaleDateString(),
                new Date(record.timestamp).toLocaleTimeString(),
                record.status
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        this.showMessage('Attendance data exported successfully!', 'success');
    }

    showMessage(message, type) {
        const existingMessage = document.querySelector('.success-message, .error-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
        messageDiv.textContent = message;
        
        if (type === 'error') {
            messageDiv.style.background = '#f8d7da';
            messageDiv.style.color = '#721c24';
            messageDiv.style.borderColor = '#f5c6cb';
        }

        const form = document.getElementById('attendanceForm');
        form.parentNode.insertBefore(messageDiv, form.nextSibling);

        setTimeout(() => messageDiv.remove(), 3000);
    }

    async saveData() {
        try {
            if (window.firebaseDB) {
                const attendanceRef = window.firebaseRef(window.firebaseDB, 'attendance');
                await window.firebaseSet(attendanceRef, this.attendanceData);
            }
        } catch (error) {
            console.log('Firebase save failed, using localStorage:', error);
        }
        localStorage.setItem('attendanceData', JSON.stringify(this.attendanceData));
    }

    async loadAttendanceData() {
        try {
            if (window.firebaseDB) {
                const attendanceRef = window.firebaseRef(window.firebaseDB, 'attendance');
                const snapshot = await window.firebaseGet(attendanceRef);
                const firebaseData = snapshot.val();
                if (firebaseData && Array.isArray(firebaseData)) {
                    this.attendanceData = firebaseData;
                } else {
                    this.attendanceData = JSON.parse(localStorage.getItem('attendanceData')) || [];
                }
            } else {
                this.attendanceData = JSON.parse(localStorage.getItem('attendanceData')) || [];
            }
        } catch (error) {
            console.log('Firebase load failed, using localStorage:', error);
            this.attendanceData = JSON.parse(localStorage.getItem('attendanceData')) || [];
        }
        this.displayAttendance();
    }

    generateQRCode() {
        const course = document.getElementById('qrCourse').value.trim();
        if (!course) {
            alert('Please enter a course name');
            return;
        }

        const now = new Date();
        const timestamp = now.getTime();
        const dateStr = now.getFullYear() + '-' + 
                       String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(now.getDate()).padStart(2, '0');
        
        const classCode = `${course}-${dateStr}-${timestamp}`;
        
        // Clear previous QR code and timer
        const qrContainer = document.getElementById('qrcode');
        qrContainer.innerHTML = '';
        if (this.qrTimer) clearTimeout(this.qrTimer);
        
        // Create QR code
        const qrSize = 200;
        const qrImg = document.createElement('img');
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(classCode)}`;
        qrImg.style.borderRadius = '10px';
        qrImg.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
        
        qrContainer.appendChild(qrImg);
        
        // Add countdown timer
        const timerElement = document.createElement('div');
        timerElement.id = 'qrTimer';
        timerElement.style.cssText = 'margin-top: 15px; font-weight: bold; color: #e74c3c; font-size: 18px;';
        qrContainer.appendChild(timerElement);
        
        document.getElementById('qrText').textContent = `Class Code: ${classCode.split('-').slice(0, -1).join('-')}`;
        
        // Start 5-minute countdown
        let timeLeft = 300; // 5 minutes in seconds
        const countdown = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerElement.textContent = `Expires in: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(countdown);
                qrContainer.innerHTML = '<p style="color: #e74c3c; font-weight: bold; font-size: 18px;">QR Code Expired</p>';
                document.getElementById('qrText').textContent = 'Generate a new QR code';
            }
            timeLeft--;
        }, 1000);
        
        // Store timer reference
        this.qrTimer = countdown;
        
        // Try QRCode library if available
        if (typeof QRCode !== 'undefined') {
            qrContainer.innerHTML = '';
            const qrDiv = document.createElement('div');
            qrContainer.appendChild(qrDiv);
            qrContainer.appendChild(timerElement);
            
            new QRCode(qrDiv, {
                text: classCode,
                width: 200,
                height: 200,
                colorDark: '#4a90e2',
                colorLight: '#ffffff'
            });
        }
    }

    logout() {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}

// Initialize the system when page loads
document.addEventListener('DOMContentLoaded', () => {
    new AttendanceSystem();
});