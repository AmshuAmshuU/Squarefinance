const { sendInquiryEmail } = require("../utils/emailService");
const asyncHandler = require("../utils/asyncHandler");

exports.sendInquiry = asyncHandler(async (req, res) => {
  const { fullName, phoneNumber, loanType, message } = req.body;

  if (!fullName || !phoneNumber || !loanType) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  await sendInquiryEmail({ fullName, phoneNumber, loanType, message });

  res.status(200).json({
    success: true,
    message: "Inquiry sent successfully",
  });
});
