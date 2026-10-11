import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export interface ExportPdfOptions {
  orientation?: 'portrait' | 'landscape';
  fileName: string;
  elementId: string;
}

export async function exportElementToPdf({
  orientation = 'portrait',
  fileName,
  elementId,
}: ExportPdfOptions): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found for PDF export`);
    return;
  }

  // Use html2canvas-pro with scale 2 for crisp resolution and oklch color support
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#FFFFFF',
    windowWidth: orientation === 'landscape' ? 1400 : 900,
  });

  if (!canvas.width || !canvas.height) {
    throw new Error('Canvas render resulted in empty dimensions');
  }

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = orientation === 'landscape' ? 297 : 210;
  const pdfHeight = orientation === 'landscape' ? 210 : 297;

  // Margin in mm
  const margin = 8;
  const printWidth = pdfWidth - margin * 2;
  const printHeight = pdfHeight - margin * 2;

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Calculate scaled height based on full printWidth
  const scaledHeight = (imgHeight * printWidth) / imgWidth;

  // For Landscape (e.g. Monthly Schedule Grid): Scale to fit exactly on 1 page
  if (orientation === 'landscape' || scaledHeight <= printHeight) {
    let targetWidth = printWidth;
    let targetHeight = scaledHeight;

    if (targetHeight > printHeight) {
      targetHeight = printHeight;
      targetWidth = (targetHeight * imgWidth) / imgHeight;
    }

    const posX = margin + (printWidth - targetWidth) / 2;
    const posY = margin + (printHeight - targetHeight) / 2;

    pdf.addImage(imgData, 'PNG', posX, posY, targetWidth, targetHeight, undefined, 'FAST');
  } else {
    // For Multi-Page Portrait (e.g. Daily Duty Summary across many days):
    // Standard sliced pagination across A4 pages
    let heightLeft = scaledHeight;
    let position = margin;
    let page = 1;

    pdf.addImage(imgData, 'PNG', margin, position, printWidth, scaledHeight, undefined, 'FAST');
    heightLeft -= printHeight;

    while (heightLeft > 0) {
      position -= printHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, printWidth, scaledHeight, undefined, 'FAST');
      heightLeft -= printHeight;
      page++;
    }
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
