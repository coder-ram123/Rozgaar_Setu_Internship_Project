import mongoose from "mongoose";

// ✅ DATABASE CONNECTION
export const dbconnection = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "Rozgaar_Setu",
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`🔥 MongoDB Connected: ${connection.connection.host}`);
  } catch (error) {
    console.error(`💥 Error occurred while connecting to database: ${error.message}`);
    process.exit(1);
  }
};
