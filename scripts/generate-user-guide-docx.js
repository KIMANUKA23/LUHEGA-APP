const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require("docx");
const fs = require("fs");

// Create document
const doc = new Document({
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                text: "LUHEGA-APP USER GUIDE",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Practical guide for managing spare parts inventory and sales.",
                        italics: true,
                    }),
                ],
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "", spacing: { after: 200 } }),

            new Paragraph({ text: "1. GETTING STARTED", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Internet Connection: ", bold: true }),
                    new TextRun("Data must be ON for your first login. After that, the app works 100% offline."),
                ],
                spacing: { before: 100, after: 100 },
            }),

            new Paragraph({ text: "2. INVENTORY & SCANNING", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
                text: "Use the Scan icon to check products. Low stock items appear on the dashboard automatically.",
                spacing: { after: 100 },
            }),

            new Paragraph({ text: "3. MAKING A SALE", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: "• Go to Inventory tab/Scan a product.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Tap Checkout and select Customer.", bullet: { level: 0 } }),
            new Paragraph({ text: "• Choose Cash or M-Pesa to finish.", bullet: { level: 0 }, spacing: { after: 100 } }),

            new Paragraph({ text: "4. REPORTS & EXPORTS", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
                text: "Tap the Share icon on any report to download a professional PDF document for WhatsApp or Email.",
                spacing: { after: 100 },
            }),

            new Paragraph({ text: "5. OFFLINE SYNC", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
                text: "Sell products anywhere. The app will sync your data automatically when you have signal.",
                spacing: { after: 200 },
            }),

            new Paragraph({
                text: "Contact Support in the settings menu if you have any questions!",
                alignment: AlignmentType.CENTER,
            }),
        ],
    }],
});

// Save document
Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("LUHEGA_APP_USER_GUIDE.docx", buffer);
    console.log("SUCCESS: Document written!");
    process.exit(0);
}).catch(err => {
    console.error("ERROR:", err);
    process.exit(1);
});
