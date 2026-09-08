/** Export CSV générique — factorisé ici car utilisé par au moins deux
 * écrans (stations, livraisons) ; toute nouvelle liste du module doit
 * réutiliser cette fonction plutôt que réimplémenter un export CSV. */
export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
