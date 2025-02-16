import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { Application } from "../models/applicationSchema.js";
import { Job } from "../models/jobSchema.js";
import cloudinary from "cloudinary";
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


/** -------------------------------
 * ✅ POST APPLICATION (Job Seeker)
 * ------------------------------- */
export const postApplication = catchAsyncErrors(async (req, res, next) => {
  console.log("🔵 Received Job Application Request...");

  // ✅ 1. Check Authentication
  if (!req.user) {
    console.error("🔴 ERROR: User not authenticated!");
    return next(new ErrorHandler("User not authenticated", 401));
  }
  console.log("🟢 User Authenticated:", req.user.role);

  // ✅ 2. Restrict Employers from Applying
  if (req.user.role === "Employer") {
    return next(new ErrorHandler("Employers cannot apply for jobs!", 400));
  }

  // ✅ 3. Ensure Resume File is Uploaded
  if (!req.files || Object.keys(req.files).length === 0) {
    console.error("🔴 ERROR: No resume file uploaded.");
    return next(new ErrorHandler("Resume File Required!", 400));
  }

  const { resume } = req.files;
  console.log("🟢 Resume file detected:", resume.name, "Type:", resume.mimetype);

  // ✅ 4. Validate Resume File Format (PDF, Images)
  const allowedFormats = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
  if (!allowedFormats.includes(resume.mimetype)) {
    console.error("🔴 ERROR: Invalid file type:", resume.mimetype);
    return next(new ErrorHandler("Invalid file type. Please upload a PDF or image file.", 400));
  }

  // ✅ 5. Upload Resume to Cloudinary
  try {
    console.log("🟡 Uploading Resume to Cloudinary...");
    const cloudinaryResponse = await cloudinary.uploader.upload(resume.tempFilePath, {
      folder: "job_applications",
    });
    
    
    if (!cloudinaryResponse || cloudinaryResponse.error) {
      console.error("🔴 ERROR: Cloudinary Upload Failed:", cloudinaryResponse.error);
      return next(new ErrorHandler("Failed to upload Resume to Cloudinary", 500));
    }

    console.log("🟢 Cloudinary Upload Success:", cloudinaryResponse.secure_url);
    
    // ✅ 6. Extract Form Data
    const { name, email, coverLetter, phone, address, jobId } = req.body;
    console.log("🟢 Extracted Form Data:", { name, email, jobId });

    // ✅ 7. Validate Job ID
    if (!jobId) {
      return next(new ErrorHandler("Job not found!", 404));
    }

    const jobDetails = await Job.findById(jobId);
    if (!jobDetails) {
      return next(new ErrorHandler("Job not found!", 404));
    }

    console.log("🟢 Job Found:", jobDetails.title);

    // ✅ 8. Set Applicant & Employer ID
    const applicantID = { user: req.user._id, role: "Job Seeker" };
    const employerID = { user: jobDetails.postedBy, role: "Employer" };

    // ✅ 9. Validate All Fields
    if (!name || !email || !coverLetter || !phone || !address) {
      console.error("🔴 ERROR: Missing Application Fields!");
      return next(new ErrorHandler("Please fill all fields.", 400));
    }

    // ✅ 10. Save Application to Database
    console.log("🟡 Saving Application to Database...");
    const application = await Application.create({
      name,
      email,
      coverLetter,
      phone,
      address,
      applicantID,
      employerID,
      resume: {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url,
      },
    });

    console.log("🟢 Application Saved Successfully!");

    res.status(200).json({
      success: true,
      message: "Application Submitted!",
      application,
    });
  } catch (error) {
    console.error("🔴 ERROR Processing Application:", error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
});

/** ------------------------------------------
 * ✅ GET ALL APPLICATIONS (For Employers)
 * ------------------------------------------ */
export const employerGetAllApplications = catchAsyncErrors(async (req, res, next) => {
  console.log("🔵 Fetching Applications for Employer...");

  if (req.user.role === "Job Seeker") {
    return next(new ErrorHandler("Job Seekers cannot access this resource!", 400));
  }

  const applications = await Application.find({ "employerID.user": req.user._id });

  console.log("🟢 Applications Retrieved:", applications.length);

  res.status(200).json({
    success: true,
    applications,
  });
});

/** ----------------------------------------
 * ✅ GET ALL APPLICATIONS (For Job Seekers)
 * ---------------------------------------- */
export const jobseekerGetAllApplications = catchAsyncErrors(async (req, res, next) => {
  console.log("🔵 Fetching Applications for Job Seeker...");

  if (req.user.role === "Employer") {
    return next(new ErrorHandler("Employers cannot access this resource!", 400));
  }

  const applications = await Application.find({ "applicantID.user": req.user._id });

  console.log("🟢 Applications Retrieved:", applications.length);

  res.status(200).json({
    success: true,
    applications,
  });
});

/** ----------------------------------------
 * ✅ DELETE APPLICATION (Job Seeker Only)
 * ---------------------------------------- */
export const jobseekerDeleteApplication = catchAsyncErrors(async (req, res, next) => {
  console.log("🔵 Deleting Application...");

  if (req.user.role === "Employer") {
    return next(new ErrorHandler("Employers cannot delete applications!", 400));
  }

  const application = await Application.findById(req.params.id);
  if (!application) {
    return next(new ErrorHandler("Application not found!", 404));
  }

  await application.deleteOne();

  console.log("🟢 Application Deleted Successfully!");

  res.status(200).json({
    success: true,
    message: "Application Deleted!",
  });
});
