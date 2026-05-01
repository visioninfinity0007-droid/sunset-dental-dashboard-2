import Papa from "papaparse";

export function generateCSV(dataToExport) {
  if (!dataToExport || dataToExport.length === 0) return "";
  return Papa.unparse(dataToExport);
}
