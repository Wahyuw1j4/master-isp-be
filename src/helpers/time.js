const getBulanIndo = (monthNumber) => {
  const bulanIndo = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
    ];
    return bulanIndo[monthNumber - 1] || null;
};
export { getBulanIndo };