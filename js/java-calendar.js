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
  </div>
	`;

	new JavaneseCalendar();
}


class JavaneseCalendar {
    constructor() {
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
        this.holidays = {
            '2025-1-1': { title: 'Tahun Baru Masehi', type: 'red' },
            '2025-1-29': { title: 'Tahun Baru Imlek', type: 'red' },
            '2025-3-14': { title: 'Hari Suci Nyepi', type: 'red' },
            '2025-3-29': { title: 'Wafat Isa Al Masih', type: 'red' },
            '2025-3-31': { title: 'Isra Mi\'raj', type: 'yellow' },
            '2025-4-9': { title: 'Hari Raya Idul Fitri', type: 'red' },
            '2025-4-10': { title: 'Hari Raya Idul Fitri', type: 'red' },
            '2025-5-1': { title: 'Hari Buruh', type: 'red' },
            '2025-5-12': { title: 'Hari Raya Waisak', type: 'red' },
            '2025-5-29': { title: 'Kenaikan Isa Al Masih', type: 'red' },
            '2025-6-1': { title: 'Hari Lahir Pancasila', type: 'red' },
            '2025-6-15': { title: 'Idul Adha', type: 'red' },
            '2025-7-5': { title: 'Tahun Baru Islam', type: 'yellow' },
            '2025-8-17': { title: 'HUT RI ke-80', type: 'red' },
            '2025-9-5': { title: 'Maulid Nabi Muhammad', type: 'yellow' },
            '2025-12-25': { title: 'Hari Raya Natal', type: 'red' }
        };
        
        this.init();
    }
    
    init() {
        this.renderCalendar();
        this.bindEvents();
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
            
            const hijriText = firstHijri.hijriMonth === lastHijri.hijriMonth ? 
                `${firstHijri.hijriMonthName} ${firstHijri.hijriYear} H` :
                `${firstHijri.hijriMonthName} - ${lastHijri.hijriMonthName} ${firstHijri.hijriYear} H`;
            
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
                
                let classes = '';
                if (isToday) classes += ' today';
                if (isSunday) classes += ' sunday';
                
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

        document.querySelectorAll('.day-cell').forEach(cell => {
		    cell.addEventListener('click', () => {
		    // hapus selected dari semua cell
		    document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('selected'));
		    // tambahkan ke cell yang diklik
		    cell.classList.add('selected');

		    // contoh: ambil nomor hari dan tampilkan di console
		    const dayNum = cell.querySelector('.num')?.textContent;
		    console.log("Tanggal dipilih:", dayNum);
		    });
		});
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
            
            // Holiday indicator
            const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            if (this.holidays[dateStr]) {
                const indicator = document.createElement('div');
                indicator.className = `indicator ${this.holidays[dateStr].type}`;
                dayCell.appendChild(indicator);
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
        
        // Filter events for current month
        const currentMonthEvents = Object.entries(this.holidays)
            .filter(([dateStr, event]) => {
                const [year, month, day] = dateStr.split('-').map(Number);
                return year === this.currentYear && month === this.currentMonth + 1;
            })
            .sort(([a], [b]) => {
                const dayA = parseInt(a.split('-')[2]);
                const dayB = parseInt(b.split('-')[2]);
                return dayA - dayB;
            });
        
        if (currentMonthEvents.length === 0) {
            eventsList.innerHTML = '<div class="event-item"><div class="event-details"><div class="event-title">Tidak ada agenda bulan ini</div></div></div>';
            return;
        }
        
        currentMonthEvents.forEach(([dateStr, event]) => {
            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            
            // Get Hijri data dari cache
            const hijriData = this.getHijriForDate(year, month, day);
            const javaneseDay = this.getJavaneseDay(date);
            
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item';
            
            let hijriText = '';
            if (hijriData) {
                hijriText = `${hijriData.hijriDay} ${hijriData.hijriMonthName} ${hijriData.hijriYear} H`;
            } else {
                hijriText = 'Data Hijriah tidak tersedia';
            }
            
            eventItem.innerHTML = `
                <div class="event-item">
			        <div class="event-date" aria-hidden="true">
			          <div class="date-day">${day}</div>
			          <div class="date-month">${this.monthNames[month - 1].slice(0, 3)}</div>
			        </div>
			        <div class="event-desc">
			          <div class="event-title">${event.title}</div>
			          <div class="event-sub">${javaneseDay}, ${day} ${this.monthNames[month - 1]} ${year} / ${hijriText}</div>
			        </div>
		      	</div>
            `;
            
            eventsList.appendChild(eventItem);
        });
    }

}
