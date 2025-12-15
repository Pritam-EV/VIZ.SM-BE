import "./Config/LoadEnv.js"; // Must be at first line
import configureMongoDb from "./Config/DatabaseConfigs.js";
// import configureMqttAsync from "./Config/MqttConfigs.js"
import getApp from "./app.js";
// import MqttService from "./Services/Mqtt/Service.js";

// Application entry point
console.info("Starting application ...");

configureMongoDb();
// await configureMqttAsync();
const app = getApp(); // Express app
const port = Number(process.env.PORT || 5000);

// Start server
const server = app.listen(port, (error) => {
    if (error) {
        console.error("Failed to start server.", "Error:", error);

        throw error;
    }

    console.info(`🚀 Server running on port ${port}`);
    console.info(`Listening on ${JSON.stringify(server.address())}`);
    console.log(`✅ API:http://https://smartmeter-vjratechnologies.web.app/api/account/signup/user`);
});

// MqttService.startProcessingIncommingMessages();
