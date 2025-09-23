function jCalendar(div, config = {}) {
    document.getElementById(div).innerHTML = `
        <div class="wrap">

        <!-- HEADER: kiri = tanggal, kanan = tombol prev/next hari -->
        <div class="calendar-header" role="banner">
          <div class="header-left">
            <p class="header-sub">Kamis Pon, 18 September 2025</p>
            <h2 class="header-main">25 Rabiul Awal 1447</h2>
          </div>

          <div class="header-right" role="navigation" aria-label="Navigasi hari">
            <button class="nav-btn prev-day" title="Hari sebelumnya">&lt;</button>
            <button class="nav-btn next-day" title="Hari berikutnya">&gt;</button>        
          </div>
        </div>

        <!-- BULAN: tombol kiri-kanan dan judul di tengah -->
        <div class="calendar-month">
          <button class="month-nav prev-month" aria-label="Bulan sebelumnya" id="prevBtn">&lt;</button>
          <div class="month-center">
            <h3 id="monthTitle">September 2025</h3>
            <div id="hijriDate"><p>Rabiul Awal - Rabiul Akhir 1447</p></div>
            <div class="loading" id="loadingIndicator" style="display: none;font-size: 11px;">Memuat data...</div>
          </div>
          <button class="month-nav next-month" aria-label="Bulan berikutnya" id="nextBtn">&gt;</button>
        </div>

        <!-- GRID KALENDER (contoh statis) -->
        <div id="errorContainer"></div>
        <div class="calendar-grid" aria-hidden="false" id="calendarGrid">

        </div>

        <!-- LIST HARI BESAR -->
        <div class="events" aria-live="polite" id="eventsList">
        </div>

        <!-- MODAL UNTUK DESCRIPTION -->
        <div id="eventModal" class="event-modal" style="display: none;">
          <div class="modal-overlay" id="modalOverlay"></div>
          <div class="modal-content">
            <div class="modal-header">
              <h3 id="modalTitle"></h3>
              <button class="modal-close" id="modalClose">&times;</button>
            </div>
            <div class="modal-body">
              <p id="modalDate"></p>
              <p id="modalDescription"></p>
            </div>
          </div>
        </div>
      </div>
    `;

    new JavaneseCalendar(config);

}

class JavaneseCalendar {
    constructor(config = {}) {
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        
        // Cache untuk data Hijriah per bulan (lebih efisien)
        this.hijriMonthCache = new Map();
        
        // Storage untuk menyimpan semua data hijriah per bulan dalam array
        this.monthlyHijriData = new Map();
        
        // Hari Jawa cycle
        this.javaDays = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'];
        this.javaEpochUtc = Date.UTC(1633, 6, 8);
        
        // Bulan Indonesia
        this.monthNames = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        
        // Bulan Hijriah
        this.hijriMonths = [
            'Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir', 'Jumadil Awal', 'Jumadil Akhir',
            'Rajab', 'Sya\'ban', 'Ramadhan', 'Syawal', 'Dzulqaidah', 'Dzulhijjah'
        ];
        
        // Hari libur nasional 2025
        this.holidays = config.holidays || {
            '2025-1-1': { 
                title: 'Tahun Baru Masehi', 
                type: 'red', 
                startDate: '2025-1-1', 
                endDate: '2025-1-1',
                description: 'Tahun Baru Masehi menandai dimulainya tahun baru dalam kalender Gregorian.'
            },
        };

        // Process multi-day events untuk ekspansi
        this.processedHolidays = this.processMultiDayEvents(this.holidays);
        
        this.init();
    }

    // Method baru: Process multi-day events
    processMultiDayEvents(holidays) {
        const processed = {};

        Object.entries(holidays).forEach(([dateKey, events]) => {
            const eventArray = Array.isArray(events) ? events : [events];

            eventArray.forEach(event => {
                const startDate = this.parseDate(event.startDate);
                const endDate = this.parseDate(event.endDate);

                // expand multi-day events
                let currentDate = new Date(startDate);
                while (currentDate <= endDate) {
                    const key = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
                    if (!processed[key]) processed[key] = [];
                    processed[key].push({
                        ...event,
                        isMultiDay: startDate.getTime() !== endDate.getTime(),
                        isStart: currentDate.getTime() === startDate.getTime(),
                        isEnd: currentDate.getTime() === endDate.getTime()
                    });
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            });
        });

        return processed;
    }

    // Helper method: parse date string
    parseDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') {
            console.warn("parseDate got invalid value:", dateStr);
            return new Date(); // fallback ke hari ini
        }

        const parts = dateStr.split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) {
            console.warn("parseDate got non-standard format:", dateStr);
            return new Date();
        }

        const [year, month, day] = parts;
        return new Date(year, month - 1, day);
    }

    // Method baru: Format date range
    formatDateRange(startDateStr, endDateStr) {
        const startDate = this.parseDate(startDateStr);
        const endDate = this.parseDate(endDateStr);
        
        if (startDateStr === endDateStr) {
            return `${startDate.getDate()} ${this.monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;
        }
        
        // Same month and year
        if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
            return `${startDate.getDate()} - ${endDate.getDate()} ${this.monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;
        }
        
        // Same year, different month
        if (startDate.getFullYear() === endDate.getFullYear()) {
            return `${startDate.getDate()} ${this.monthNames[startDate.getMonth()]} - ${endDate.getDate()} ${this.monthNames[endDate.getMonth()]} ${startDate.getFullYear()}`;
        }
        
        // Different year
        return `${startDate.getDate()} ${this.monthNames[startDate.getMonth()]} ${startDate.getFullYear()} - ${endDate.getDate()} ${this.monthNames[endDate.getMonth()]} ${endDate.getFullYear()}`;
    }
    
    init() {
        this.renderCalendar();
        this.bindEvents();
        this.bindModalEvents(); // Tambah binding untuk modal
    }

    // Method baru untuk modal events
    bindModalEvents() {
        const modal = document.getElementById('eventModal');
        const modalOverlay = document.getElementById('modalOverlay');
        const modalClose = document.getElementById('modalClose');

        // Close modal saat klik overlay atau tombol close
        modalOverlay.addEventListener('click', () => this.closeModal());
        modalClose.addEventListener('click', () => this.closeModal());
        
        // Close modal saat tekan ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display !== 'none') {
                this.closeModal();
            }
        });
    }

    // Method untuk membuka modal
    openModal(event) {
        const modal = document.getElementById('eventModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalDate = document.getElementById('modalDate');
        const modalDescription = document.getElementById('modalDescription');

        modalTitle.textContent = event.title;
        modalDate.textContent = this.formatDateRange(event.startDate, event.endDate);
        modalDescription.textContent = event.description || 'Tidak ada deskripsi tersedia.';

        modal.style.display = 'block';
        // Fokus ke modal untuk accessibility
        modal.focus();
    }

    // Method untuk menutup modal
    closeModal() {
        const modal = document.getElementById('eventModal');
        modal.style.display = 'none';
    }
    
    bindEvents() {
        document.getElementById('prevBtn').addEventListener('click', () => {
            this.currentMonth--;
            if (this.currentMonth < 0) {
                this.currentMonth = 11;
                this.currentYear--;
            }
            this.renderCalendar();
        });
        
        document.getElementById('nextBtn').addEventListener('click', () => {
            this.currentMonth++;
            if (this.currentMonth > 11) {
                this.currentMonth = 0;
                this.currentYear++;
            }
            this.renderCalendar();
        });

        // navigasi hari di header
        document.querySelector('.prev-day').addEventListener('click', () => {
            this.currentDate.setDate(this.currentDate.getDate() - 1);
            this.currentMonth = this.currentDate.getMonth();
            this.currentYear = this.currentDate.getFullYear();
            this.renderCalendar();
            this.updateHeader(this.currentDate);
            this.updateSelectedDay(); // Update selected day
        });
        document.querySelector('.next-day').addEventListener('click', () => {
            this.currentDate.setDate(this.currentDate.getDate() + 1);
            this.currentMonth = this.currentDate.getMonth();
            this.currentYear = this.currentDate.getFullYear();
            this.renderCalendar();
            this.updateHeader(this.currentDate);
            this.updateSelectedDay(); // Update selected day
        });
    }
    
    // Fetch seluruh data Hijriah untuk 1 bulan sekaligus
    async fetchHijriMonth(year, month) {
        const monthKey = `${year}-${month}`;
        
        // Check cache first
        if (this.monthlyHijriData.has(monthKey)) {
            console.log(`Using cached Hijri data for ${monthKey}`);
            return this.monthlyHijriData.get(monthKey);
        }
        
        try {
            const response = await fetch(`https://api.aladhan.com/v1/gToHCalendar/${month}/${year}`);
            const data = await response.json();
            
            if (data.code === 200 && data.data && Array.isArray(data.data)) {
                const hijriArray = data.data.map(dayData => ({
                    gregorianDay: parseInt(dayData.gregorian.day),
                    hijriDay: parseInt(dayData.hijri.day),
                    hijriMonth: parseInt(dayData.hijri.month.number),
                    hijriYear: parseInt(dayData.hijri.year),
                    hijriMonthName: dayData.hijri.month.en,
                    hijriMonthNameAr: dayData.hijri.month.ar,
                    hijriWeekday: dayData.hijri.weekday.en
                }));
                
                // Cache hasil API
                this.monthlyHijriData.set(monthKey, hijriArray);
                console.log(`Cached Hijri data for ${monthKey}:`, hijriArray.length, 'days');
                
                return hijriArray;
            } else {
                throw new Error('Invalid API response structure');
            }
        } catch (error) {
            console.error('Error fetching Hijri month:', error);
            // Fallback ke perhitungan manual
            return this.generateFallbackHijriMonth(year, month);
        }
    }
    
    // Generate fallback data jika API gagal
    generateFallbackHijriMonth(year, month) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const fallbackData = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const hijri = this.gregorianToHijriFallback(date);
            
            fallbackData.push({
                gregorianDay: day,
                hijriDay: hijri.day,
                hijriMonth: hijri.month,
                hijriYear: hijri.year,
                hijriMonthName: this.hijriMonths[hijri.month] || this.hijriMonths[hijri.month - 1],
                hijriMonthNameAr: hijri.monthNameAr || '',
                hijriWeekday: 'Unknown'
            });
        }
        
        const monthKey = `${year}-${month}`;
        this.monthlyHijriData.set(monthKey, fallbackData);
        console.log(`Generated fallback Hijri data for ${monthKey}`);
        
        return fallbackData;
    }
    
    // Get Hijri data untuk tanggal tertentu dari array yang sudah di-cache
    getHijriForDate(year, month, day) {
        const monthKey = `${year}-${month}`;
        const monthData = this.monthlyHijriData.get(monthKey);
        
        if (monthData) {
            const dayData = monthData.find(item => item.gregorianDay === day);
            return dayData || null;
        }
        
        return null;
    }
    
    // Fallback calculation jika API gagal
    gregorianToHijriFallback(date) {
        const gregorianDate = new Date(date);
        const gregorianYear = gregorianDate.getFullYear();
        const gregorianMonth = gregorianDate.getMonth() + 1;
        const gregorianDay = gregorianDate.getDate();
        
        // Simple approximation
        const totalDays = this.daysSinceEpoch(gregorianYear, gregorianMonth, gregorianDay);
        const hijriDays = totalDays - 227015;
        const hijriYear = Math.floor(hijriDays / 354.36) + 1;
        const remainingDays = hijriDays % 354.36;
        const hijriMonth = Math.floor(remainingDays / 29.53) + 1;
        const hijriDay = Math.floor(remainingDays % 29.53) + 1;
        
        return {
            year: Math.max(1, Math.floor(hijriYear)),
            month: Math.max(1, Math.min(12, Math.floor(hijriMonth))),
            day: Math.max(1, Math.min(30, Math.floor(hijriDay))),
            monthName: this.hijriMonths[Math.max(0, Math.min(11, Math.floor(hijriMonth) - 1))]
        };
    }
    
    daysSinceEpoch(year, month, day) {
        const date = new Date(year, month - 1, day);
        const epoch = new Date(1970, 0, 1);
        return Math.floor((date - epoch) / (24 * 60 * 60 * 1000));
    }
    
    // Get Javanese day (5-day cycle)
    getJavaneseDay(date) {
        // pastikan 'date' adalah object Date
        const dayUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
        const diffDays = Math.floor((dayUtc - this.javaEpochUtc) / 86400000);
        // normalisasi modulo agar selalu 0..4 (aman untuk negatif)
        const idx = ((diffDays % 5) + 5) % 5;
        return this.javaDays[idx];
    }
    
    // Convert to Arabic numerals
    toArabicNumerals(num) {
        const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return num.toString().split('').map(digit => arabicNums[parseInt(digit)]).join('');
    }
    
    async renderCalendar() {
        this.showLoading(true);
        this.clearError();
        
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        // Update header
        document.getElementById('monthTitle').textContent = 
            `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
        
        try {
            // Fetch seluruh data Hijriah untuk bulan ini (1 API call saja!)
            console.log(`Fetching Hijri data for ${this.currentYear}-${this.currentMonth + 1}`);
            const hijriMonthData = await this.fetchHijriMonth(this.currentYear, this.currentMonth + 1);
            
            // Update Hijri date range dari data yang sudah di-fetch
            const firstHijri = hijriMonthData[0];
            const lastHijri = hijriMonthData[hijriMonthData.length - 1];
            
            // Gunakan nama bulan dari variabel hijriMonths (Indonesia)
            const firstHijriMonthName = this.hijriMonths[firstHijri.hijriMonth - 1];
            const lastHijriMonthName = this.hijriMonths[lastHijri.hijriMonth - 1];
            
            const hijriText = firstHijri.hijriMonth === lastHijri.hijriMonth ? 
                `${firstHijriMonthName} ${firstHijri.hijriYear} H` :
                `${firstHijriMonthName} - ${lastHijriMonthName} ${firstHijri.hijriYear} H`;
            
            document.getElementById('hijriDate').textContent = hijriText;
            
            // Clear calendar grid
            const calendarGrid = document.getElementById('calendarGrid');
            calendarGrid.innerHTML = `
                <div class="day-name">Ahad</div>
                <div class="day-name">Senin</div>
                <div class="day-name">Selasa</div>
                <div class="day-name">Rabu</div>
                <div class="day-name">Kamis</div>
                <div class="day-name">Jumat</div>
                <div class="day-name">Sabtu</div>
            `;
            
            // Add previous month's last days
            const prevMonth = new Date(this.currentYear, this.currentMonth - 1, 0);
            const prevMonthDays = prevMonth.getDate();
            
            for (let i = startingDayOfWeek - 1; i >= 0; i--) {
                const day = prevMonthDays - i;
                const date = new Date(this.currentYear, this.currentMonth - 1, day);
                const dayCell = this.createDayCell(day, date, 'prev-month');
                calendarGrid.appendChild(dayCell);
            }
            
            // Add current month days (menggunakan data yang sudah di-cache)
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(this.currentYear, this.currentMonth, day);
                const isToday = this.isToday(date);
                const isSunday = date.getDay() === 0;
                const isFriday = date.getDay() === 5; // Tambah deteksi hari Jumat
                
                let classes = '';
                if (isToday) classes += ' today selected';
                if (isSunday) classes += ' sunday';
                if (isFriday) classes += ' friday'; // Tambah class friday
                
                // Get Hijri data dari array yang sudah di-cache
                const hijriData = this.getHijriForDate(this.currentYear, this.currentMonth + 1, day);
                const dayCell = this.createDayCell(day, date, classes, hijriData);
                calendarGrid.appendChild(dayCell);
            }
            
            // Add next month's first days
            const remainingCells = 42 - calendarGrid.children.length;
            for (let day = 1; day <= remainingCells; day++) {
                const date = new Date(this.currentYear, this.currentMonth + 1, day);
                const dayCell = this.createDayCell(day, date, 'next-month');
                calendarGrid.appendChild(dayCell);
            }
            
        } catch (error) {
            console.error('Error rendering calendar:', error);
            this.showError('Terjadi kesalahan saat memuat data Hijriah. Menggunakan perhitungan estimasi.');
            document.getElementById('hijriDate').textContent = 'Error: Menggunakan estimasi';
        }
        
        // Update events
        this.renderEvents();
        this.showLoading(false);
        this.updateHeader(this.currentDate);

        // Bind click events untuk day cells
        this.bindDayCellEvents();
    }

    // Method baru untuk bind day cell events
    bindDayCellEvents() {
        document.querySelectorAll('.day-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                // hapus selected dari semua cell
                document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('selected'));
                // tambahkan ke cell yang diklik
                cell.classList.add('selected');

                const dayNum = parseInt(cell.querySelector('.num')?.textContent, 10);
                
                // Cek apakah cell adalah prev-month atau next-month
                if (cell.classList.contains('prev-month')) {
                    // Pindah ke bulan sebelumnya
                    this.currentMonth--;
                    if (this.currentMonth < 0) {
                        this.currentMonth = 11;
                        this.currentYear--;
                    }
                    this.currentDate = new Date(this.currentYear, this.currentMonth, dayNum);
                    this.renderCalendar();
                } else if (cell.classList.contains('next-month')) {
                    // Pindah ke bulan berikutnya
                    this.currentMonth++;
                    if (this.currentMonth > 11) {
                        this.currentMonth = 0;
                        this.currentYear++;
                    }
                    this.currentDate = new Date(this.currentYear, this.currentMonth, dayNum);
                    this.renderCalendar();
                } else {
                    // Current month day
                    this.currentDate = new Date(this.currentYear, this.currentMonth, dayNum);
                    this.updateHeader(this.currentDate);
                }
            });
        });
    }

    // Method baru untuk update selected day setelah navigasi
    updateSelectedDay() {
        // Hapus semua selected class
        document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('selected'));
        
        // Cari day cell yang sesuai dengan currentDate
        const targetDay = this.currentDate.getDate();
        const targetMonth = this.currentDate.getMonth();
        const targetYear = this.currentDate.getFullYear();
        
        // Jika tanggal yang dicari ada di bulan yang sedang ditampilkan
        if (targetMonth === this.currentMonth && targetYear === this.currentYear) {
            document.querySelectorAll('.day-cell').forEach(cell => {
                // Skip prev-month dan next-month cells
                if (!cell.classList.contains('prev-month') && !cell.classList.contains('next-month')) {
                    const dayNum = parseInt(cell.querySelector('.num')?.textContent, 10);
                    if (dayNum === targetDay) {
                        cell.classList.add('selected');
                    }
                }
            });
        }
    }
    
    createDayCell(day, date, extraClasses = '', hijriData = null) {
        const dayCell = document.createElement('div');
        dayCell.className = `day-cell ${extraClasses}`;
        
        // Day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'num';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);
        
        // Hijri date dan Javanese day hanya untuk bulan saat ini
        if (!extraClasses.includes('prev-month') && !extraClasses.includes('next-month')) {
            
            // Tampilkan Hijri date dari data yang sudah di-cache
            if (hijriData) {
                const hijriNumber = document.createElement('div');
                hijriNumber.className = 'hijri-number';
                hijriNumber.textContent = this.toArabicNumerals(hijriData.hijriDay);
                dayCell.appendChild(hijriNumber);
            } else {
                const hijriNumber = document.createElement('div');
                hijriNumber.className = 'hijri-number';
                hijriNumber.textContent = '-';
                dayCell.appendChild(hijriNumber);
            }
            
            // Javanese day
            const javaneseDay = document.createElement('small');
            javaneseDay.className = 'javanese-day';
            javaneseDay.textContent = this.getJavaneseDay(date);
            dayCell.appendChild(javaneseDay);
            
            // Holiday indicator - GUNAKAN PROCESSED HOLIDAYS
            const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            if (this.processedHolidays[dateStr]) {
                const events = this.processedHolidays[dateStr];

                // buat container khusus untuk indikator
                const indicatorsContainer = document.createElement('div');
                indicatorsContainer.className = 'indicators';

                const order = ['red', 'green', 'blue', 'yellow'];
                let shown = 0;

                order.forEach(color => {
                    if (shown >= 4) return;
                    const event = events.find(e => e.type === color);
                    if (event) {
                        const indicator = document.createElement('span');
                        let indicatorClass = `indicator ${event.type}`;
                        if (event.isMultiDay) {
                            if (event.isStart) indicatorClass += ' event-start';
                            if (event.isEnd) indicatorClass += ' event-end';
                            if (!event.isStart && !event.isEnd) indicatorClass += ' event-middle';
                        }
                        indicator.className = indicatorClass;
                        indicatorsContainer.appendChild(indicator);
                        shown++;
                    }
                });

                dayCell.appendChild(indicatorsContainer);
            }
        }
        
        return dayCell;
    }
    
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() && 
               date.getMonth() === today.getMonth() && 
               date.getFullYear() === today.getFullYear();
    }
    
    showLoading(show) {
        const loading = document.getElementById('loadingIndicator');
        loading.style.display = show ? 'block' : 'none';
        
        // Disable/enable navigation buttons
        document.getElementById('prevBtn').disabled = show;
        document.getElementById('nextBtn').disabled = show;
    }
    
    showError(message) {
        const errorContainer = document.getElementById('errorContainer');
        errorContainer.innerHTML = `<div class="error-message">${message}</div>`;
    }
    
    clearError() {
        const errorContainer = document.getElementById('errorContainer');
        errorContainer.innerHTML = '';
    }
    
    renderEvents() {
        const eventsList = document.getElementById('eventsList');
        eventsList.innerHTML = '';
        
        const uniqueEvents = new Map();
        const currentMonthStart = new Date(this.currentYear, this.currentMonth, 1);
        const currentMonthEnd = new Date(this.currentYear, this.currentMonth + 1, 0);

        Object.entries(this.processedHolidays).forEach(([dateKey, events]) => {
            events.forEach(event => {
                // identitas unik = title+range
                const eventKey = `${event.title}-${event.startDate}-${event.endDate}`;
                const startDate = this.parseDate(event.startDate);
                const endDate = this.parseDate(event.endDate);

                const eventInThisMonth = (
                    (startDate >= currentMonthStart && startDate <= currentMonthEnd) ||
                    (endDate >= currentMonthStart && endDate <= currentMonthEnd) ||
                    (startDate < currentMonthStart && endDate > currentMonthEnd)
                );

                if (eventInThisMonth && !uniqueEvents.has(eventKey)) {
                    let displayDate = dateKey;
                    if (startDate < currentMonthStart) {
                        displayDate = `${this.currentYear}-${this.currentMonth + 1}-1`;
                    }

                    uniqueEvents.set(eventKey, {
                        ...event,
                        displayDate: displayDate,
                        isPartialMonth: startDate < currentMonthStart || endDate > currentMonthEnd
                    });
                }
            });
        });

        // sort by displayDate
        const sortedEvents = Array.from(uniqueEvents.entries())
            .sort(([kA, eA], [kB, eB]) => {
                const dayA = parseInt(eA.displayDate.split('-')[2]);
                const dayB = parseInt(eB.displayDate.split('-')[2]);
                return dayA - dayB;
            });

        if (sortedEvents.length === 0) {
            eventsList.innerHTML = `
                <div class="event-item">
                    <div class="event-details">
                        <div class="event-title">Tidak ada agenda bulan ini</div>
                    </div>
                </div>`;
            return;
        }

        sortedEvents.forEach(([eventKey, event]) => {
            const [year, month, day] = event.displayDate.split('-').map(Number);
            const date = new Date(year, month - 1, day);

            const hijriData = this.getHijriForDate(year, month, day);
            const javaneseDay = this.getJavaneseDay(date);
            const indoDay = date.toLocaleDateString('id-ID', { weekday: 'long' });
            
            let hijriText = '';
            if (hijriData) {
                hijriText = `${hijriData.hijriDay} ${this.hijriMonths[hijriData.hijriMonth - 1]} ${hijriData.hijriYear} H`;
            } else {
                hijriText = 'Data Hijriah tidak tersedia';
            }

            const dateRange = this.formatDateRange(event.startDate, event.endDate);

            let crossMonthInfo = '';
            if (event.isPartialMonth) {
                if (this.parseDate(event.startDate) < currentMonthStart) {
                    crossMonthInfo = ' (lanjutan)';
                } else if (this.parseDate(event.endDate) > currentMonthEnd) {
                    crossMonthInfo = ' (berlanjut)';
                }
            }

            const eventItem = document.createElement('div');
            eventItem.className = 'event-item clickable';

            const durationText = event.isMultiDay ? ` (Multi-hari)${crossMonthInfo}` : '';

            eventItem.innerHTML = `
                <div class="event-item">
                    <div class="event-date ${event.type}" aria-hidden="true">
                      <div class="date-day">${day}</div>
                      <div class="date-month">${this.monthNames[month - 1].slice(0, 3)}</div>
                    </div>
                    <div class="event-desc">
                      <div class="event-title">${event.title}${durationText}</div>
                      <div class="event-sub">${indoDay} ${javaneseDay}, ${dateRange} / ${hijriText}</div>
                    </div>
                </div>
            `;

            eventItem.addEventListener('click', () => this.openModal(event));
            eventItem.setAttribute('tabindex', '0');
            eventItem.setAttribute('role', 'button');
            eventItem.setAttribute('aria-label', `Lihat detail ${event.title}`);
            eventItem.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.openModal(event);
                }
            });

            eventsList.appendChild(eventItem);
        });
    }

    updateHeader(date) {
        const hijriData = this.getHijriForDate(date.getFullYear(), date.getMonth() + 1, date.getDate());

        const javaDay = this.getJavaneseDay(date);
        const indoDay = date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        var tampilan = indoDay;

        if (indoDay.indexOf('Minggu') !== -1) {
            tampilan = indoDay.replace('Minggu', 'Ahad '+javaDay);
        }
        if (indoDay.indexOf('Senin') !== -1) {
            tampilan = indoDay.replace('Senin', 'Senin '+javaDay);
        }
        if (indoDay.indexOf('Selasa') !== -1) {
            tampilan = indoDay.replace('Selasa', 'Selasa '+javaDay);
        }
        if (indoDay.indexOf('Rabu') !== -1) {
            tampilan = indoDay.replace('Rabu', 'Rabu '+javaDay);
        }
        if (indoDay.indexOf('Kamis') !== -1) {
            tampilan = indoDay.replace('Kamis', 'Kamis '+javaDay);
        }
        if (indoDay.indexOf('Jumat') !== -1) {
            tampilan = indoDay.replace('Jumat', 'Jumat '+javaDay);
        }
        if (indoDay.indexOf('Sabtu') !== -1) {
            tampilan = indoDay.replace('Sabtu', 'Sabtu '+javaDay);
        }

        // document.querySelector('.header-sub').textContent = `${indoDay}, ${javaDay}`;
        document.querySelector('.header-sub').textContent = tampilan;

        if (hijriData) {
            document.querySelector('.header-main').textContent =
                `${hijriData.hijriDay} ${this.hijriMonths[hijriData.hijriMonth - 1]} ${hijriData.hijriYear} H`;
        } else {
            document.querySelector('.header-main').textContent = '-';
        }
    }

}