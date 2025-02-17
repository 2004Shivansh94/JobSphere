import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { v2 as cloudinary } from 'cloudinary';

// ✅ Ensure you use cloudinary.v2 properly
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,

});

// ✅ Debugging: Check if variables are loaded
console.log("Cloudinary Config:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? "✅ Loaded" : "❌ Missing",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "✅ Loaded" : "❌ Missing",
});


app.listen(process.env.PORT, () => {
  console.log(`Server running at port ${process.env.PORT}`);
});
