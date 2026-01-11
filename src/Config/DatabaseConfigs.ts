import mongoose from "mongoose";
import { Environment } from "../Shared/Common/Enums/Process.js";

export default function configureMongoDb() {
    mongoose.set("debug", true);
    mongoose
        .connect(
            process.env.MONGO_URI,
            {
                serverSelectionTimeoutMS: 10000,
                autoIndex: process.env.NODE_ENV == Environment.Development
            }
        )
        .then(() => console.info("✅ MongoDB Connected"))
        .catch(err => {
            console.error(err, `❌ MongoDB Connection Error: ${err?.message}`);
            throw err;
        })
    ;

    mongoose.connection.on('error', error => {
        console.error(error, `MongoDb connection error. ${error?.message}`);
    });

}