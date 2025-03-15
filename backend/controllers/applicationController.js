import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Application } from "../models/applicationSchema.js";
import { Job } from "../models/jobSchema.js";
import { v2 as cloudinary } from "cloudinary";

// ✅ POST APPLICATION
export const postApplication = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { name, email, phone, address, coverLetter } = req.body;

  // ➡️ Validation
  if (!name || !email || !phone || !address || !coverLetter) {
    return next(new ErrorHandler("All fields are required.", 400));
  }

  const jobSeekerInfo = {
    id: req.user._id,
    name,
    email,
    phone,
    address,
    coverLetter,
    role: "Job Seeker",
  };

  // ➡️ Check Job Exists
  const jobDetails = await Job.findById(id);
  if (!jobDetails) {
    return next(new ErrorHandler("Job not found.", 404));
  }

  // ➡️ Check Duplicate Application
  const isAlreadyApplied = await Application.findOne({
    "jobInfo.jobId": id,
    "jobSeekerInfo.id": req.user._id,
  });
  if (isAlreadyApplied) {
    return next(new ErrorHandler("You have already applied for this job.", 400));
  }

  // ✅ Resume Handling
  if (req.files && req.files.resume) {
    const { resume } = req.files;

    if (!resume.tempFilePath) {
      return next(new ErrorHandler("Resume file path is missing.", 400));
    }

    try {
      // ➡️ File Extension Handling
      const fileExtension = resume.name.split('.').pop().toLowerCase();

      let uploadOptions = {
        folder: "Job_Seekers_Resume",
      };

      if (["jpg", "jpeg", "png"].includes(fileExtension)) {
        uploadOptions.resource_type = "image";
        uploadOptions.format = fileExtension;
      } else if (fileExtension === "pdf") {
        uploadOptions.resource_type = "image";
        uploadOptions.format = "jpg";
        uploadOptions.page = 1;
      } else if (["doc", "docx"].includes(fileExtension)) {
        uploadOptions.resource_type = "raw";
      } else {
        return next(new ErrorHandler(`Unsupported file format: ${fileExtension}`, 400));
      }

      console.log("Uploading resume to Cloudinary...");
      const cloudinaryResponse = await cloudinary.uploader.upload(
        resume.tempFilePath,
        uploadOptions
      );

      if (!cloudinaryResponse || cloudinaryResponse.error) {
        console.error("Cloudinary Upload Error:", cloudinaryResponse.error);
        return next(new ErrorHandler("Failed to upload resume to Cloudinary.", 500));
      }

      jobSeekerInfo.resume = {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url,
      };

    } catch (error) {
      console.error("Cloudinary Upload Exception:", error);
      return next(new ErrorHandler("Failed to upload resume", 500));
    }
  } else {
    // ➡️ Check Existing Resume
    if (!req.user.resume || !req.user.resume.url) {
      return next(new ErrorHandler("Please upload your resume.", 400));
    }

    jobSeekerInfo.resume = {
      public_id: req.user.resume.public_id,
      url: req.user.resume.url,
    };
  }

  // ✅ Employer Info
  const employerInfo = {
    id: jobDetails.postedBy,
    role: "Employer",
  };

  // ✅ Job Info
  const jobInfo = {
    jobId: id,
    jobTitle: jobDetails.title,
  };

  // ✅ Create Application
  const application = await Application.create({
    jobSeekerInfo,
    employerInfo,
    jobInfo,
  });

  res.status(201).json({
    success: true,
    message: "Application submitted.",
    application,
  });
});

// ✅ EMPLOYER GET ALL APPLICATIONS
export const employerGetAllApplication = catchAsyncErrors(async (req, res, next) => {
  const { _id } = req.user;

  const applications = await Application.find({
    "employerInfo.id": _id,
    "deletedBy.employer": false,
  });

  res.status(200).json({
    success: true,
    applications,
  });
});

// ✅ JOB SEEKER GET ALL APPLICATIONS
export const jobSeekerGetAllApplication = catchAsyncErrors(async (req, res, next) => {
  const { _id } = req.user;

  const applications = await Application.find({
    "jobSeekerInfo.id": _id,
    "deletedBy.jobSeeker": false,
  });

  res.status(200).json({
    success: true,
    applications,
  });
});

// ✅ DELETE APPLICATION
export const deleteApplication = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  // ➡️ Check Application Exists
  const application = await Application.findById(id);
  if (!application) {
    return next(new ErrorHandler("Application not found.", 404));
  }

  // ➡️ Role Based Deletion
  const { role } = req.user;
  switch (role) {
    case "Job Seeker":
      application.deletedBy.jobSeeker = true;
      await application.save();
      break;

    case "Employer":
      application.deletedBy.employer = true;
      await application.save();
      break;

    default:
      console.log("Default case for application delete function.");
      break;
  }

  // ➡️ Permanent Delete if Both Deleted
  if (application.deletedBy.employer === true && application.deletedBy.jobSeeker === true) {
    await application.deleteOne();
  }

  res.status(200).json({
    success: true,
    message: "Application Deleted.",
  });
});
