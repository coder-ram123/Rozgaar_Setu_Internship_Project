import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { User } from "../models/userSchema.js";
import { v2 as cloudinary } from "cloudinary";
import { sendToken } from "../utils/jwtToken.js";

// ✅ REGISTER USER
export const register = catchAsyncErrors(async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      password,
      role,
      firstNiche,
      secondNiche,
      thirdNiche,
      coverLetter,
    } = req.body;

    // ➡️ Validation
    if (!name || !email || !phone || !address || !password || !role) {
      return next(new ErrorHandler("All fields are required.", 400));
    }
    if (role === "Job Seeker" && (!firstNiche || !secondNiche || !thirdNiche)) {
      return next(new ErrorHandler("Please provide your preferred job niches.", 400));
    }

    // ➡️ Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorHandler("Email is already registered.", 400));
    }

    const userData = {
      name,
      email,
      phone,
      address,
      password,
      role,
      niches: {
        firstNiche,
        secondNiche,
        thirdNiche,
      },
      coverLetter,
    };

    // ✅ Resume Upload Handling
    if (req.files && req.files.resume) {
      const { resume } = req.files;
      if (resume) {
        try {
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

          const cloudinaryResponse = await cloudinary.uploader.upload(
            resume.tempFilePath,
            uploadOptions
          );

          userData.resume = {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
          };
        } catch (error) {
          return next(new ErrorHandler(`Failed to upload resume: ${error.message}`, 500));
        }
      }
    }

    // ✅ Create User
    const user = await User.create(userData);
    sendToken(user, 201, res, "User Registered.");
  } catch (error) {
    next(error);
  }
});

// ✅ UPDATE PROFILE
export const updateProfile = catchAsyncErrors(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
    coverLetter: req.body.coverLetter,
    niches: {
      firstNiche: req.body.firstNiche,
      secondNiche: req.body.secondNiche,
      thirdNiche: req.body.thirdNiche,
    },
  };

  if (
    req.user.role === "Job Seeker" &&
    (!newUserData.niches.firstNiche ||
      !newUserData.niches.secondNiche ||
      !newUserData.niches.thirdNiche)
  ) {
    return next(new ErrorHandler("Please provide your preferred job niches.", 400));
  }

  // ✅ Resume Update Handling
  if (req.files && req.files.resume) {
    const { resume } = req.files;
    if (resume) {
      try {
        // Delete existing resume if available
        if (req.user.resume?.public_id) {
          await cloudinary.uploader.destroy(req.user.resume.public_id);
        }

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

        const cloudinaryResponse = await cloudinary.uploader.upload(
          resume.tempFilePath,
          uploadOptions
        );

        newUserData.resume = {
          public_id: cloudinaryResponse.public_id,
          url: cloudinaryResponse.secure_url,
        };
      } catch (error) {
        return next(new ErrorHandler(`Failed to upload resume: ${error.message}`, 500));
      }
    }
  }

  // ✅ Update User
  const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    user,
    message: "Profile updated.",
  });
});

// ✅ LOGIN USER
export const login = catchAsyncErrors(async (req, res, next) => {
  const { role, email, password } = req.body;

  if (!role || !email || !password) {
    return next(new ErrorHandler("Email, password, and role are required.", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return next(new ErrorHandler("Invalid email or password.", 400));
  }

  if (user.role !== role) {
    return next(new ErrorHandler("Invalid user role.", 400));
  }

  sendToken(user, 200, res, "User logged in successfully.");
});

// ✅ LOGOUT USER
export const logout = catchAsyncErrors(async (req, res, next) => {
  res.cookie("token", "", {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

// ✅ GET USER
export const getUser = catchAsyncErrors(async (req, res, next) => {
  const user = req.user;

  res.status(200).json({
    success: true,
    user,
  });
});

// ✅ UPDATE PASSWORD
export const updatePassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  if (!(await user.comparePassword(req.body.oldPassword))) {
    return next(new ErrorHandler("Old password is incorrect.", 400));
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    return next(new ErrorHandler("Passwords do not match.", 400));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendToken(user, 200, res, "Password updated successfully.");
});
