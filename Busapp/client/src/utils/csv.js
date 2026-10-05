/**
 * Robust CSV parser and helper utilities for bulk imports
 */

export function parseCSV(text) {
  if (!text || typeof text !== 'string') return [];

  // Normalize line endings
  const rawLines = text.split(/\r\n|\n|\r/).filter(line => line.trim().length > 0);
  if (rawLines.length < 2) return [];

  const parseLine = (line) => {
    const row = [];
    let insideQuotes = false;
    let currentCell = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    
    return row.map(cell => cell.replace(/^["']|["']$/g, '').trim());
  };

  const headers = parseLine(rawLines[0]).map(h => 
    h.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  const results = [];
  for (let i = 1; i < rawLines.length; i++) {
    const values = parseLine(rawLines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
    
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] || '';
    });
    results.push(obj);
  }

  return results;
}

export function downloadCSV(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const STUDENT_PASS_CSV_TEMPLATE = `Name,Username,Password,Email,RouteEntitlement,ValidUntil,Status
Alex Mercer,alex1001,student123,alex.mercer@student.edu,All Routes,2027-12-31,Valid
David Kim,david1002,student123,david.kim@student.edu,Route 1 Only,2027-12-31,Valid
Elena Rostova,elena1003,student123,elena.r@student.edu,All Routes,2026-12-31,Suspended`;

export const DRIVER_CSV_TEMPLATE = `Name,Username,Password,Phone,AssignedBusId,Status
John Doe,john.driver,password123,+1-555-0101,bus-101,Active
Sarah Jenkins,sarah.driver,password123,+1-555-0102,bus-102,Active
Mike Unassigned,mike.driver,password123,+1-555-0103,,Off Duty`;

export const BUS_CSV_TEMPLATE = `Number,DriverName,RouteId,Status
BUS #105,John Doe,route-1,Active
BUS #106,Sarah Jenkins,route-1,Active
BUS #107,Unassigned,,Active`;

export const ROUTE_CSV_TEMPLATE = `Name,Color,Stops
North Line Shuttle,#3b82f6,"Ettumanoor, Pala, College of Engineering Poonjar"
South Express Line,#10b981,"Kottayam, Kanjirappally, College of Engineering Poonjar"`;
