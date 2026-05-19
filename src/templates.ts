export interface TemplateItem {
    id: string;
    title: string;
    points: number;
    category: string;
  }
  
  export const MISSION_TEMPLATES: TemplateItem[] = [
    // 🏠 Kemandirian
    { id: 'm1', title: 'Sikat Gigi Tanpa Drama (Pagi & Malam)', points: 1, category: '🏠 Kemandirian' },
    { id: 'm2', title: 'Taruh Baju Kotor ke Keranjang', points: 1, category: '🏠 Kemandirian' },
    { id: 'm3', title: 'Merapikan Mainan Sendiri', points: 2, category: '🏠 Kemandirian' },
    { id: 'm4', title: 'Habisin Makanan di Piring', points: 1, category: '🏠 Kemandirian' },
    { id: 'm5', title: 'Pakai Baju / Sepatu Sendiri', points: 1, category: '🏠 Kemandirian' },
    // 📚 Belajar & Gadget
    { id: 'm6', title: 'Matikan HP Tepat Waktu (No Ngamuk)', points: 2, category: '📚 Belajar' },
    { id: 'm7', title: 'Kerjakan PR / Tugas Tepat Waktu', points: 2, category: '📚 Belajar' },
    { id: 'm8', title: 'Siapkan Buku Pelajaran Besok Malam', points: 1, category: '📚 Belajar' },
    { id: 'm9', title: 'Membaca Buku Non-Pelajaran (15 Menit)', points: 2, category: '📚 Belajar' },
    // ❤️ Karakter & Bantuan
    { id: 'm10', title: 'Bicara Tenang saat Kesal (Anti-Tantrum)', points: 3, category: '❤️ Karakter' },
    { id: 'm11', title: 'Berbagi Mainan/Makanan ke Kakak/Adik', points: 2, category: '❤️ Karakter' },
    { id: 'm12', title: 'Bantu Ibu Buang Sampah / Lap Meja', points: 1, category: '❤️ Karakter' },
    { id: 'm13', title: 'Ucapkan Tolong, Maaf, & Terima Kasih', points: 2, category: '❤️ Karakter' },
    // 🕌 Ibadah
    { id: 'm14', title: 'Shalat / Beribadah Tepat Waktu', points: 3, category: '🕌 Ibadah' },
    { id: 'm15', title: 'Membaca Kitab Suci / Mengaji (1 Lembar)', points: 2, category: '🕌 Ibadah' },
    { id: 'm16', title: 'Hafalan Doa Pendek / Surat Pendek', points: 3, category: '🕌 Ibadah' },
    { id: 'm17', title: 'Berdoa Sebelum Makan & Tidur', points: 1, category: '🕌 Ibadah' },
    { id: 'm18', title: 'Masukin Koin ke Kotak Amal / Celengan', points: 2, category: '🕌 Ibadah' },
    // 🍏 Kesehatan
    { id: 'm19', title: 'Mencoba 3 Suap Sayur / Buah Baru', points: 2, category: '🍏 Kesehatan' },
    { id: 'm20', title: 'Minum Air Putih 4 Gelas Sehari', points: 1, category: '🍏 Kesehatan' },
    { id: 'm21', title: 'Tidur Siang Tepat Waktu (No Drama)', points: 2, category: '🍏 Kesehatan' },
    { id: 'm22', title: 'Cuci Tangan Pakai Sabun Sebelum Makan', points: 1, category: '🍏 Kesehatan' }
  ];
  
  export const REWARD_TEMPLATES: TemplateItem[] = [
    // 🔓 Hak Istimewa
    { id: 'r1', title: 'Ekstra Screen Time 30 Menit', points: 5, category: '🔓 Hak Istimewa' },
    { id: 'r2', title: 'Bebas Pilih Menu Makan Malam Keluarga', points: 10, category: '🔓 Hak Istimewa' },
    { id: 'r3', title: 'Tidur Lebih Lambat 30 Menit di Malam Minggu', points: 7, category: '🔓 Hak Istimewa' },
    { id: 'r4', title: 'Boleh Undang Teman Main ke Rumah', points: 15, category: '🔓 Hak Istimewa' },
    // 🎁 Materiil
    { id: 'r5', title: 'Beli Es Krim / Camilan Favorit', points: 8, category: '🎁 Materiil' },
    { id: 'r6', title: 'Pergi Jalan-Jalan ke Taman / Playground', points: 25, category: '🎁 Materiil' },
    { id: 'r7', title: 'Beli Mainan Impian / Wishlist Utama', points: 50, category: '🎁 Materiil' },
    // 👪 Quality Time
    { id: 'r8', title: 'Dibacain 2 Cerita Dongeng Sebelum Tidur', points: 6, category: '👪 Quality Time' },
    { id: 'r9', title: 'Main Board Game / Puzzle Bareng Ayah', points: 12, category: '👪 Quality Time' },
    { id: 'r10', title: 'Sesi Pelukan 10 Menit Sebelum Tidur', points: 5, category: '👪 Quality Time' },
    { id: 'r11', title: 'Bikin Bioskop Mini di Kamar (Nonton Bareng)', points: 15, category: '👪 Quality Time' },
    // ❓ Kupon Misteri
    { id: 'r12', title: 'Tukar "Kupon Hadiah Misteri" (Gacha)', points: 10, category: '❓ Kupon Misteri' }
  ];