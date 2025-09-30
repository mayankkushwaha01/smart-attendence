class StudentDashboard {
    constructor() {
        this.currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        this.html5QrCode = null;
        this.attendanceData = [];
        
        if (!this.currentUser || this.currentUser.role !== 'student') {
            window.location.href = 'login.html';
            return;
        }
        
        this.initializeEventListeners();
        this.loadStudentData();
        this.loadAttendanceData();
    }

    initializeEventListeners() {
        // Navigation
        document.getElementById('profileBtn').addEventListener('click', () => this.showSection('profile'));
        document.getElementById('editBtn').addEventListener('click', () => this.showSection('edit'));
        document.getElementById('scannerBtn').addEventListener('click', () => this.showSection('scanner'));
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        
        // Scanner controls
        document.getElementById('startScan').addEventListener('click', () => this.startScanner());
        document.getElementById('stopScan').addEventListener('click', () => this.stopScanner());
        
        // Manual entry
        document.getElementById('manualForm').addEventListener('submit', (e) => this.handleManualEntry(e));
        
        // QR Upload
        document.getElementById('uploadBtn').addEventListener('click', () => this.triggerUpload());
        document.getElementById('qrUpload').addEventListener('change', (e) => this.handleQRUpload(e));
        
        // Edit profile
        document.getElementById('editProfileForm').addEventListener('submit', (e) => this.saveProfile(e));
        document.getElementById('cancelEdit').addEventListener('click', () => this.showSection('profile'));
        

    }

    showSection(section) {
        // Update navigation
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(section + 'Btn').classList.add('active');

        // Update sections
        document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(section + 'Section').classList.add('active');
        
        // Load edit form if switching to edit section
        if (section === 'edit') {
            this.loadEditForm();
        }
    }

    loadStudentData() {
        document.getElementById('studentName').textContent = this.currentUser.name;
        document.getElementById('studentId').textContent = this.currentUser.id;
        document.getElementById('studentCourse').textContent = this.getCourseFullName(this.currentUser.course);
    }

    getCourseFullName(courseCode) {
        const courses = {
            'BCA': '💻 BCA (Bachelor of Computer Applications)',
            'BBA': '💼 BBA (Bachelor of Business Administration)'
        };
        return courses[courseCode] || courseCode;
    }

    calculateAttendance() {
        const studentAttendance = this.attendanceData.filter(record => 
            record.studentId === this.currentUser.id
        );

        const totalClasses = 20; // Assume 20 total classes
        const presentCount = studentAttendance.length;
        const attendancePercentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

        document.getElementById('totalClasses').textContent = totalClasses;
        document.getElementById('presentCount').textContent = presentCount;
        document.getElementById('attendancePercentage').textContent = attendancePercentage + '%';

        // Update percentage color
        const percentageElement = document.getElementById('attendancePercentage');
        if (attendancePercentage >= 75) {
            percentageElement.style.color = '#27ae60';
        } else if (attendancePercentage >= 50) {
            percentageElement.style.color = '#f39c12';
        } else {
            percentageElement.style.color = '#e74c3c';
        }

        this.displayAttendanceHistory(studentAttendance);
    }

    displayAttendanceHistory(attendance) {
        const historyContainer = document.getElementById('attendanceHistory');
        
        if (attendance.length === 0) {
            historyContainer.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No attendance records found.</p>';
            return;
        }

        // Show last 5 records
        const recentAttendance = attendance.slice(-5).reverse();
        
        historyContainer.innerHTML = recentAttendance.map(record => `
            <div class="attendance-record">
                <div>
                    <strong>${this.getCourseFullName(record.course)}</strong>
                    <br>
                    <small>${new Date(record.timestamp).toLocaleDateString()}</small>
                </div>
                <div style="color: #27ae60; font-weight: bold;">
                    ${new Date(record.timestamp).toLocaleTimeString()}
                </div>
            </div>
        `).join('');
    }

    async startScanner() {
        try {
            const scanResult = document.getElementById('scanResult');
            scanResult.innerHTML = '';

            this.html5QrCode = new Html5Qrcode("video");
            
            await this.html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText) => {
                    this.handleScanResult(decodedText);
                    this.stopScanner();
                },
                (errorMessage) => {
                    // Handle scan errors silently
                }
            );

            document.getElementById('startScan').disabled = true;
            document.getElementById('stopScan').disabled = false;
            
        } catch (err) {
            this.showScanResult('Camera access denied or not available. Please use manual entry.', 'error');
        }
    }

    async stopScanner() {
        if (this.html5QrCode) {
            try {
                await this.html5QrCode.stop();
                this.html5QrCode = null;
            } catch (err) {
                console.log('Scanner stop error:', err);
            }
        }
        
        document.getElementById('startScan').disabled = false;
        document.getElementById('stopScan').disabled = true;
    }

    handleScanResult(classCode) {
        this.markAttendance(classCode);
    }

    handleManualEntry(e) {
        e.preventDefault();
        const classCode = document.getElementById('classCode').value;
        this.markAttendance(classCode);
        document.getElementById('classCode').value = '';
    }

    triggerUpload() {
        document.getElementById('qrUpload').click();
    }

    async handleQRUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const html5QrCode = new Html5Qrcode("temp-reader");
            const qrCodeResult = await html5QrCode.scanFile(file, true);
            
            this.handleScanResult(qrCodeResult);
            this.showScanResult('QR code uploaded and processed successfully!', 'success');
        } catch (error) {
            console.error('QR upload error:', error);
            this.showScanResult('Failed to read QR code from image. Please try again.', 'error');
        }
        
        // Clear the file input
        e.target.value = '';
    }

    markAttendance(classCode) {
        // Validate class code format (e.g., COURSE-2024-01-15-timestamp)
        const codeParts = classCode.split('-');
        if (codeParts.length < 4) {
            this.showScanResult('Invalid class code format!', 'error');
            return;
        }

        const course = codeParts[0];
        const year = codeParts[1];
        const month = codeParts[2];
        const day = codeParts[3];
        const timestamp = codeParts[4];
        
        // Check if QR code is expired (5 minutes)
        if (timestamp) {
            const qrTime = parseInt(timestamp);
            const currentTime = new Date().getTime();
            const timeDiff = (currentTime - qrTime) / 1000; // in seconds
            
            if (timeDiff > 300) { // 5 minutes = 300 seconds
                this.showScanResult('QR Code has expired! Please ask teacher for a new one.', 'error');
                return;
            }
        }

        const classDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if class is for today
        if (classDate.getTime() !== today.getTime()) {
            this.showScanResult('This class code is not valid for today!', 'error');
            return;
        }

        // Check if already marked
        const alreadyMarked = this.attendanceData.some(record => 
            record.studentId === this.currentUser.id && 
            record.course === course && 
            new Date(record.timestamp).toDateString() === today.toDateString()
        );

        if (alreadyMarked) {
            this.showScanResult('Attendance already marked for this class today!', 'error');
            return;
        }

        // Mark attendance
        const attendanceRecord = {
            id: Date.now(),
            studentId: this.currentUser.id,
            studentName: this.currentUser.name,
            course: course,
            timestamp: new Date().toISOString(),
            status: 'Present'
        };

        this.attendanceData.push(attendanceRecord);
        
        // Save to Firebase
        this.saveAttendanceData();
        
        this.showScanResult(`Attendance marked successfully for ${this.getCourseFullName(course)}!`, 'success');
        this.calculateAttendance();
    }

    showScanResult(message, type) {
        const resultDiv = document.getElementById('scanResult');
        resultDiv.textContent = message;
        resultDiv.className = `scan-result ${type}`;
        
        setTimeout(() => {
            resultDiv.textContent = '';
            resultDiv.className = 'scan-result';
        }, 5000);
    }

    loadEditForm() {
        document.getElementById('editName').value = this.currentUser.name || '';
        document.getElementById('editStudentId').value = this.currentUser.id || '';
        document.getElementById('editEmail').value = this.currentUser.email || '';
        document.getElementById('editPhone').value = this.currentUser.phone || '';
        document.getElementById('editCourse').value = this.currentUser.course || '';
        document.getElementById('editDOB').value = this.currentUser.dob || '';
        document.getElementById('editAddress').value = this.currentUser.address || '';
    }

    saveProfile(e) {
        e.preventDefault();
        
        const updatedUser = {
            ...this.currentUser,
            name: document.getElementById('editName').value,
            email: document.getElementById('editEmail').value,
            phone: document.getElementById('editPhone').value,
            course: document.getElementById('editCourse').value,
            dob: document.getElementById('editDOB').value,
            address: document.getElementById('editAddress').value
        };

        // Update session storage
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
        this.currentUser = updatedUser;
        
        // Update registered users if this is a registered user
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
        const userIndex = registeredUsers.findIndex(u => u.username === this.currentUser.username);
        if (userIndex !== -1) {
            registeredUsers[userIndex] = updatedUser;
            localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
        }

        // Update profile display
        this.loadStudentData();
        
        // Show success message
        this.showMessage('Profile updated successfully!', 'success');
        
        // Switch back to profile tab
        setTimeout(() => {
            this.showSection('profile');
        }, 1500);
    }

    showMessage(message, type) {
        const existingMessage = document.querySelector('.profile-message');
        if (existingMessage) existingMessage.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = `profile-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 10px;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.5s ease-out;
        `;
        
        if (type === 'success') {
            messageDiv.style.background = 'linear-gradient(135deg, #d4edda, #c3e6cb)';
            messageDiv.style.color = '#155724';
        } else {
            messageDiv.style.background = 'linear-gradient(135deg, #f8d7da, #f5c6cb)';
            messageDiv.style.color = '#721c24';
        }
        
        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 3000);
    }

    async saveAttendanceData() {
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
        this.calculateAttendance();
    }

    logout() {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new StudentDashboard();
});