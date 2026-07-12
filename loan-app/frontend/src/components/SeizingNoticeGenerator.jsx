"use client";
import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import "@fontsource/noto-sans-kannada/700.css";

const SeizingNoticeGenerator = ({
  loan,
  bearerName,
  pendingEmis,
  showSeal,
}) => {
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      const today = format(new Date(), "dd-MM-yyyy");

      const customerName =
        loan.customerDetails?.customerName || "........................";
      const vehicleNo =
        loan.vehicleInformation?.vehicleNumber || "........................";
      const engineNo =
        loan.vehicleInformation?.engineNumber || "........................";
      const chassisNo =
        loan.vehicleInformation?.chassisNumber || "........................";
      const modelYear =
        loan.vehicleInformation?.modelYear || "........................";
      const bearer = bearerName || "........................";

      // Calculate from date (earliest pending EMI)
      let fromDate = "........................";
      if (pendingEmis && pendingEmis.length > 0) {
        const sorted = [...pendingEmis].sort(
          (a, b) => new Date(a.dueDate) - new Date(b.dueDate),
        );
        fromDate = format(new Date(sorted[0].dueDate), "dd-MM-yyyy");
      }

      // ---- PRELOAD KANNADA FONT ----
      await document.fonts.load("bold 48px 'Noto Sans Kannada'");

      // ---- RENDER HEADER VIA CANVAS (for proper Kannada text) ----
      const headerCanvas = document.createElement("canvas");
      const scale = 3;
      const canvasW = 794 * scale;
      const canvasH = 280 * scale;
      headerCanvas.width = canvasW;
      headerCanvas.height = canvasH;
      const ctx = headerCanvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasW, canvasH);

      const cx = canvasW / 2;

      // SF Logo Box (Combined with text)
      const boxW = 100 * scale;
      const boxH = 55 * scale;
      const boxX = cx - boxW / 2;
      const boxY = 8 * scale;
      ctx.strokeStyle = "#26467a";
      ctx.lineWidth = 3 * scale;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // SF Text
      ctx.font = `900 ${32 * scale}px 'Arial', sans-serif`;
      ctx.fillStyle = "#26467a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SF", cx, boxY + boxH / 2 - 6 * scale);

      // Restore Square Finance Text below SF (inside box) for brand consistency
      ctx.font = `bold ${8.5 * scale}px 'Arial', sans-serif`;
      ctx.fillStyle = "#8b3a36";
      ctx.fillText("Square Finance", cx, boxY + boxH - 10 * scale);

      // English Title - SQUARE FINANCE (Prominent)
      ctx.font = `bold ${42 * scale}px 'Arial', 'Helvetica', sans-serif`;
      ctx.fillStyle = "#26467a";
      ctx.textBaseline = "top";
      ctx.fillText("SQUARE FINANCE", cx, boxY + boxH + 15 * scale);

      // Kannada Text - Synchronized Size
      ctx.font = `bold ${42 * scale}px 'Noto Sans Kannada', 'Tunga', 'Kannada MN', sans-serif`;
      ctx.fillStyle = "#1e1e1e";
      ctx.textBaseline = "top";
      ctx.fillText("ಸ್ಕ್ವೇರ್ ಫೈನಾನ್ಸ್", cx, boxY + boxH + 75 * scale);

      // Remove the separate Square Finance drawing below as it's now inside the box

      // Red line
      const lineY = boxY + boxH + 120 * scale;
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.moveTo(75 * scale, lineY);
      ctx.lineTo(canvasW - 75 * scale, lineY);
      ctx.stroke();

      // Embed header image
      const headerImg = headerCanvas.toDataURL("image/png");
      const headerPdfH = 55;
      pdf.addImage(headerImg, "PNG", margin, 2, contentWidth, headerPdfH);

      // ---- TITLE ----
      pdf.setFont("helvetica", "bolditalic");
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text("REPOSSESSING AUTHORITY", pageWidth / 2, 65, {
        align: "center",
      });

      // Underline
      const titleWidth = pdf.getTextWidth("REPOSSESSING AUTHORITY");
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(
        (pageWidth - titleWidth) / 2,
        67,
        (pageWidth + titleWidth) / 2,
        67,
      );

      // ---- DATE ----
      let y = 78;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(`Date: ${today}`, margin, y);

      // ---- BODY TEXT ----
      y += 14;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      const bodyPart1 =
        "This is to authorize the bearer of this repossessing letter Mr. ";
      const bodyPart2 = `${bearer}`;
      const bodyPart3 = ` Employee of `;
      const bodyPart4 = "Square Finance";
      const bodyPart5 = ` to repossess the Vehicle from the Hirer/loanee `;
      const bodyPart6 = `${customerName}`;
      const bodyPart7 =
        " due to the hirer's delay in repaying the loan amount within the specified time. The bearer of this letter has all the rights to seize the vehicle as the hirer has not paid any amount for consequent 70 days or above.";

      // Build the full text and use splitTextToSize for wrapping
      const fullBody =
        bodyPart1 +
        bodyPart2 +
        bodyPart3 +
        bodyPart4 +
        bodyPart5 +
        bodyPart6 +
        bodyPart7;
      const bodyLines = pdf.splitTextToSize(fullBody, contentWidth);
      pdf.text(bodyLines, margin, y);
      y += bodyLines.length * 5;

      // Second paragraph
      y += 8;
      const para2 =
        "The vehicle can be repossessed from whomsoever or wherever it may be found at.";
      pdf.text(para2, margin + 10, y);

      // ---- LOAN REPAYMENT DUE PERIOD ----
      y += 18;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Loan Repayment due period:", margin, y);

      y += 10;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`From: ${fromDate}`, margin, y);
      pdf.text(`To: ${today}`, margin + 80, y);

      // ---- VEHICLE DETAILS ----
      y += 16;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Vehicle details:", margin, y);

      y += 10;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      pdf.text(`Model Year: ${modelYear}`, margin, y);
      // Remove the duplicate model line if any, or keep it if separate field exists. 
      // Based on user request "modul change to modul year", we focus on Model Year.

      // Row 2: Registration Number + Engine Number
      y += 8;
      pdf.text(`Registration Number: ${vehicleNo}`, margin, y);
      pdf.text(`Engine Number: ${engineNo}`, margin + 95, y);

      // Row 3: Chassis Number
      y += 8;
      pdf.text(`Chassis Number: ${chassisNo}`, margin, y);

      // ---- LOANEE NAME ----
      y += 16;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(`Loanee Name: ${customerName}`, margin, y);

      // ---- SIGNATURE ----
      y += 30;

      // Conditionally add seal and signature
      if (showSeal) {
        try {
          // Position seal where the signature would be
          pdf.addImage(
            "/assets/images/seal-sign.png",
            "PNG",
            margin,
            y - 15,
            50,
            25,
          );
          y += 10; // Add some space after seal
        } catch (e) {
          console.error("Failed to add seal image", e);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          pdf.text("For Square Finance", margin, y);
        }
      } else {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text("For Square Finance", margin, y);
      }

      // ---- FOOTER ----
      const footerY = 280;
      pdf.setFillColor(185, 28, 28);
      pdf.rect(margin, footerY, contentWidth, 8, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        "No.1,17/4, Ground Floor, 5th Main, 5th Cross, Kathriguppe, BSK 3rd Stage, Bengaluru - 560 085",
        margin + 2,
        footerY + 5,
      );
      pdf.text("+91 99009 00007", pageWidth - margin - 2, footerY + 5, {
        align: "right",
      });

      // Open in new tab
      const blobURL = pdf.output("bloburl");
      window.open(blobURL, "_blank");
    } catch (error) {
      console.error("PDF Generation failed", error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={generating || !bearerName?.trim()}
      className="px-12 py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50"
    >
      {generating ? "Generating Document..." : "Generate Seizing Notice PDF"}
    </button>
  );
};

export default SeizingNoticeGenerator;
