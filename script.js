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
        const subjectsGrid = document.getElementById('subjectsGrid');

        let filteredData = this.attendanceData;

        // Apply date filter
        if (filterDate) {
            filteredData = filteredData.filter(record => 
                new Date(record.timestamp).toDateString() === new Date(filterDate).toDateString()
            );
        }

        // Group by subject
        const subjectGroups = {};
        filteredData.forEach(record => {
            if (!subjectGroups[record.course]) {
                subjectGroups[record.course] = [];
            }
            subjectGroups[record.course].push(record);
        });

        // Filter by course if selected
        if (filterCourse) {
            const filtered = {};
            if (subjectGroups[filterCourse]) {
                filtered[filterCourse] = subjectGroups[filterCourse];
            }
            Object.assign(subjectGroups, {}, filtered);
        }

        // Sort students within each subject by timestamp
        Object.keys(subjectGroups).forEach(subject => {
            subjectGroups[subject].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        });

        if (Object.keys(subjectGroups).length === 0) {
            subjectsGrid.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 50px; grid-column: 1 / -1;">No attendance records found.</p>';
            return;
        }

        subjectsGrid.innerHTML = Object.keys(subjectGroups).map(subject => {
            const students = subjectGroups[subject];
            return `
                <div class="subject-column">
                    <div class="subject-header">
                        <h3>${this.getCourseFullName(subject)}</h3>
                        <div class="student-count">${students.length} student${students.length !== 1 ? 's' : ''} present</div>
                    </div>
                    <div class="student-list">
                        ${students.length > 0 ? students.map(student => {
                            const date = new Date(student.timestamp);
                            return `
                                <div class="student-item">
                                    <div class="student-name">
                                        <i class="fas fa-user"></i> ${student.studentName}
                                    </div>
                                    <div class="student-details">
                                        <span><i class="fas fa-id-card"></i> ${student.studentId}</span>
                                        <span class="attendance-time">${date.toLocaleTimeString()}</span>
                                    </div>
                                    ${student.location && !student.location.error ? `
                                        <div class="student-location">
                                            <i class="fas fa-map-marker-alt"></i> 
                                            <span class="location-coords">${student.location.latitude}, ${student.location.longitude}</span>
                                            <button class="view-map-btn" onclick="window.open('https://maps.google.com/?q=${student.location.latitude},${student.location.longitude}', '_blank')">
                                                <i class="fas fa-external-link-alt"></i> View Map
                                            </button>
                                        </div>
                                    ` : '<div class="student-location"><i class="fas fa-map-marker-alt"></i> Location not available</div>'}
                                </div>
                            `;
                        }).join('') : '<div class="no-students">No students present</div>'}
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
            if (window.firebaseDB && window.firebaseSet) {
                const attendanceRef = window.firebaseRef(window.firebaseDB, 'attendance');
                // Convert array to object for Firebase
                const dataObject = {};
                this.attendanceData.forEach((record, index) => {
                    dataObject[record.id || index] = record;
                });
                await window.firebaseSet(attendanceRef, dataObject);
                console.log('Teacher saved attendance to Firebase successfully');
            }
        } catch (error) {
            console.error('Teacher Firebase save failed:', error);
        }
        localStorage.setItem('attendanceData', JSON.stringify(this.attendanceData));
    }

    async loadAttendanceData() {
        try {
            if (window.firebaseDB && window.firebaseGet) {
                const attendanceRef = window.firebaseRef(window.firebaseDB, 'attendance');
                const snapshot = await window.firebaseGet(attendanceRef);
                const firebaseData = snapshot.val();
                
                if (firebaseData) {
                    // Convert Firebase object to array
                    this.attendanceData = Object.values(firebaseData);
                    console.log('Teacher loaded attendance from Firebase:', this.attendanceData.length, 'records');
                } else {
                    this.attendanceData = JSON.parse(localStorage.getItem('attendanceData')) || [];
                    console.log('No Firebase data, teacher loaded from localStorage:', this.attendanceData.length, 'records');
                }
            } else {
                this.attendanceData = JSON.parse(localStorage.getItem('attendanceData')) || [];
                console.log('Firebase not available for teacher, using localStorage only');
            }
        } catch (error) {
            console.error('Teacher Firebase load failed:', error);
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