const mongoose = require("mongoose");

const rtoWorkSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "RTO work name is required"],
      unique: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("RtoWork", rtoWorkSchema);
