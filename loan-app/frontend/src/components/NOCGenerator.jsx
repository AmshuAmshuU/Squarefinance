"use client";
import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import "@fontsource/noto-sans-kannada/700.css";

const NOCGenerator = ({ loan, showSeal }) => {
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
      const vehicleNo =
        loan.vehicleInformation?.vehicleNumber || "........................";
      const customerName =
        loan.customerDetails?.customerName || "........................";

      // ---- PRELOAD KANNADA FONT ----
      await document.fonts.load("bold 48px 'Noto Sans Kannada'");

      // ---- RENDER HEADER VIA CANVAS (for proper Kannada text) ----
      const headerCanvas = document.createElement("canvas");
      const scale = 3; // High-res
      const canvasW = 794 * scale; // A4 width at 96dpi * scale
      const canvasH = 280 * scale;
      headerCanvas.width = canvasW;
      headerCanvas.height = canvasH;
      const ctx = headerCanvas.getContext("2d");

      // White background
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

      // Embed header image in PDF
      const headerImg = headerCanvas.toDataURL("image/png");
      const headerPdfH = 55; // Height in mm in the PDF
      pdf.addImage(headerImg, "PNG", margin, 2, contentWidth, headerPdfH);

      // Red line under header (drawn by the canvas above)

      const centerX = pageWidth / 2;

      // ---- TITLE ----
      pdf.setFont("helvetica", "bolditalic");
      pdf.setFontSize(18);
      pdf.setTextColor(0, 0, 0);
      pdf.text("NO OBJECTION LETTER", pageWidth / 2, 65, { align: "center" });

      // Underline
      const titleWidth = pdf.getTextWidth("NO OBJECTION LETTER");
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(
        (pageWidth - titleWidth) / 2,
        67,
        (pageWidth + titleWidth) / 2,
        67,
      );

      // ---- FROM & DATE ----
      let y = 78;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("From :", margin, y);
      pdf.text(`Date: ${today}`, pageWidth - margin, y, { align: "right" });

      y += 6;
      pdf.setFontSize(12);
      pdf.text("Square Finance", margin, y);

      y += 5;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text("#1,17/4, Ground Floor, 5th Main, 5th Cross", margin, y);
      y += 4;
      pdf.text("Kathriguppe, BSK 3rd Stage, Bengaluru - 560085", margin, y);

      // ---- TO ----
      y += 12;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("To,", margin, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      pdf.text("The Regional Transport Authority", margin, y);
      y += 4;
      pdf.text("Bangalore", margin, y);

      // ---- BODY ----
      y += 12;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("Dear Sir :", margin, y);

      y += 10;
      pdf.setFont("helvetica", "normal");
      const modelYear =
        loan.vehicleInformation?.modelYear || "........................";
      pdf.text(
        `Ref : Vehicle Bearing No.  ${vehicleNo}  (Model Year: ${modelYear})`,
        margin + 10,
        y,
      );

      y += 7;
      pdf.text(`Hirer / Loanee name :  ${customerName}`, margin + 10, y);

      y += 12;
      const bodyText =
        `I wish to advice you that I have received payment in settlement of his Hire purchase ` +
        `agreement entered into with by the above hirer in respect of the said Vehicle ${vehicleNo} ` +
        `and I have no objection for the cancellation of the H.P. Endorsement made in my favour ` +
        `on the Registration certificate of the above said vehicle. I also forward here with the ` +
        `form No.35 in duplicate duly completed by me.`;

      pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(bodyText, contentWidth);
      pdf.text(lines, margin, y);
      y += lines.length * 5;

      // ---- VALIDITY STATEMENT ----
      y += 8;
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.text("This NOC is valid for 30 days from the date of issue of this letter.", margin, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      // ---- CLOSING ----
      y += 15;
      pdf.setFont("helvetica", "bold");
      pdf.text("Thanking you,", margin, y);

      // Signature area
      y += 10;

      if (showSeal) {
        try {
          // Place seal inside the logical signature area without a hard box border if it has its own
          pdf.addImage(
            "/assets/images/seal-sign.png",
            "PNG",
            margin + 2,
            y - 5,
            55,
            28,
          );
        } catch (e) {
          console.error("Failed to add seal image", e);
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.5);
          pdf.rect(margin, y, 60, 30);
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.text("For Square Finance", margin + 30, y + 27, {
            align: "center",
          });
        }
      } else {
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.rect(margin, y, 60, 30);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("For Square Finance", margin + 30, y + 27, {
          align: "center",
        });
      }

      // "Yours faithfully" on the right (reset y to box top for alignment)
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("Yours faithfully,", pageWidth - margin, y, {
        align: "right",
      });

      // Attached note
      y += 35;
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "italic");
      pdf.text("Attached Form No. 35 Duly Signed by me & Party", margin, y);

      // ---- FOOTER ----
      const footerY = 280;
      pdf.setFillColor(185, 28, 28); // red-700
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
      disabled={generating}
      className="px-12 py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
    >
      {generating ? "Generating Document..." : "Generate NOC PDF"}
    </button>
  );
};

export default NOCGenerator;
