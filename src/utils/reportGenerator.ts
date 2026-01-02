import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatTZS } from './currency';

export interface ReportData {
    title: string;
    subtitle: string;
    date: string;
    kpis: { label: string; value: string }[];
    sections: {
        title: string;
        columns: string[];
        rows: string[][];
    }[];
}

export const generateReportPDF = async (data: ReportData) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #1e293b; background-color: #ffffff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
          .logo-text { color: #1e3a8a; font-size: 24px; font-weight: bold; margin: 0; }
          .tagline { color: #64748b; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; }
          .report-info { text-align: right; }
          .report-title { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0 0 5px 0; }
          .report-subtitle { font-size: 16px; color: #64748b; margin: 0; }
          
          .kpi-container { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 40px; }
          .kpi-card { flex: 1; min-width: 150px; background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
          .kpi-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; }
          .kpi-value { font-size: 20px; font-weight: 700; color: #1e40af; }
          
          .section { margin-bottom: 35px; }
          .section-title { font-size: 18px; font-weight: 700; color: #334155; margin-bottom: 15px; padding-left: 10px; border-left: 4px solid #3b82f6; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { background-color: #f1f5f9; text-align: left; padding: 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
          td { padding: 12px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; }
          tr:nth-child(even) { background-color: #fcfcfc; }
          
          .footer { margin-top: 50px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; color: #94a3b8; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="logo-text">LUHEGA APP</h1>
            <p class="tagline">Smart Business Solutions</p>
          </div>
          <div class="report-info">
            <h2 class="report-title">${data.title}</h2>
            <p class="report-subtitle">${data.subtitle} • ${data.date}</p>
          </div>
        </div>

        <div class="kpi-container">
          ${data.kpis.map(kpi => `
            <div class="kpi-card">
              <div class="kpi-label">${kpi.label}</div>
              <div class="kpi-value">${kpi.value}</div>
            </div>
          `).join('')}
        </div>

        ${data.sections.map(section => `
          <div class="section">
            <h3 class="section-title">${section.title}</h3>
            <table>
              <thead>
                <tr>
                  ${section.columns.map(col => `<th>${col}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${section.rows.map(row => `
                  <tr>
                    ${row.map(cell => `<td>${cell}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}

        <div class="footer">
          Generated via Luhega App on ${new Date().toLocaleString()} | Restricted Access
        </div>
      </body>
    </html>
  `;

    try {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};
